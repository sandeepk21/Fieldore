import {
  CreateEstimateRequest,
  EstimateLineItemRequest,
  ServiceCatalogItemResponse,
} from '@/src/api/generated';
import { useLoader } from '@/src/context/LoaderContext';
import {
  EstimateAttachmentFile,
  buildPublicQuoteUrl,
  createEstimateApi,
  sendEstimateApi,
  uploadEstimateAttachmentApi,
} from '@/src/services/estimateService';
import { getServiceCatalogApi } from '@/src/services/serviceCatalogService';
import { formatCurrency } from '@/src/utils/currency';
import {
  LineItemErrors,
  hasValidLineItem,
  validateDeposit,
  validateDiscount,
  validateEstimateDates,
  validateEstimateLineItem,
  validateTaxRate,
} from '@/src/utils/estimateValidation';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import { router, useLocalSearchParams } from 'expo-router';
import {
  BookMarked,
  CalendarDays,
  ChevronLeft,
  FileText,
  Paperclip,
  Plus,
  Search,
  Send,
  Tag,
  Trash2,
  Upload,
  User,
  X,
} from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ─── Types ────────────────────────────────────────────────────────────────────

interface EstimateItem {
  id: string;
  service: string;
  description: string;
  qty: number;
  price: number;
}

type DiscountType = 'fixed' | 'percent';
type DepositType = 'none' | 'percent' | 'fixed';
type ActivePicker = 'issue' | 'expiry' | null;
type NotesTab = 'customer' | 'internal';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const toDateOnly = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const formatDateLabel = (date: Date): string =>
  new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).format(date);

const round2 = (v: number): number => Math.round((v + Number.EPSILON) * 100) / 100;

const addDays = (date: Date, days: number): Date => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

// Accent colour cycles per line-item card
const ITEM_ACCENTS = ['#2563eb', '#8b5cf6', '#059669', '#f59e0b', '#ef4444', '#ec4899'];

// ─── SectionCard ──────────────────────────────────────────────────────────────
// Design: tinted header band (accent at 10% opacity) + white body.
// No left stripe — the header background gives colour context.

const SectionCard: React.FC<{
  title: string;
  accent: string;
  subtitle?: string;
  children: React.ReactNode;
}> = ({ title, accent, subtitle, children }) => (
  <View style={sc.card}>
    {/* Tinted header row */}
    <View style={[sc.head, { backgroundColor: accent + '18' }]}>
      <View style={[sc.dot, { backgroundColor: accent }]} />
      <View style={{ flex: 1 }}>
        <Text style={sc.title}>{title}</Text>
        {subtitle ? <Text style={sc.subtitle}>{subtitle}</Text> : null}
      </View>
    </View>
    {/* White body */}
    <View style={sc.body}>{children}</View>
  </View>
);

const sc = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  dot: { width: 9, height: 9, borderRadius: 5 },
  title: { fontSize: 15, fontWeight: '900', color: '#0f172a' },
  subtitle: { fontSize: 11, fontWeight: '600', color: '#64748b', marginTop: 2 },
  body: { paddingHorizontal: 20, paddingBottom: 20 },
});

// ─── Main Component ───────────────────────────────────────────────────────────

const EstimateCreatorScreen: React.FC = () => {
  const params = useLocalSearchParams<{ customerId?: string; customerName?: string }>();
  const customerId = typeof params.customerId === 'string' ? params.customerId : '';
  const customerName =
    typeof params.customerName === 'string' && params.customerName.trim()
      ? params.customerName
      : 'Customer';

  const { showLoader, hideLoader } = useLoader();

  // ── State ──
  const [items, setItems] = useState<EstimateItem[]>([
    { id: '1', service: '', description: '', qty: 1, price: 0 },
  ]);
  const [issuedOn, setIssuedOn] = useState<Date>(new Date());
  const [expiresOn, setExpiresOn] = useState<Date>(addDays(new Date(), 30));
  const [activePicker, setActivePicker] = useState<ActivePicker>(null);
  const [discountType, setDiscountType] = useState<DiscountType>('fixed');
  const [discountValue, setDiscountValue] = useState('0');
  const [taxRate, setTaxRate] = useState('0');
  const [depositType, setDepositType] = useState<DepositType>('none');
  const [depositValue, setDepositValue] = useState('0');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [notesTab, setNotesTab] = useState<NotesTab>('customer');
  const [submitting, setSubmitting] = useState(false);
  const [attachments, setAttachments] = useState<EstimateAttachmentFile[]>([]);
  const [catalogVisible, setCatalogVisible] = useState(false);
  const [catalogItems, setCatalogItems] = useState<ServiceCatalogItemResponse[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const markTouched = (key: string) =>
    setTouched(prev => (prev[key] ? prev : { ...prev, [key]: true }));
  const showError = (key: string) => submitAttempted || !!touched[key];

  // ── Item helpers ──
  const addItem = () =>
    setItems(prev => [...prev, { id: Date.now().toString(), service: '', description: '', qty: 1, price: 0 }]);

  const removeItem = (id: string) => {
    if (items.length === 1) return;
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const updateItem = (id: string, field: keyof EstimateItem, value: string | number) =>
    setItems(prev => prev.map(i => (i.id === id ? { ...i, [field]: value } : i)));

  // ── Catalog ──
  const openCatalog = async () => {
    setCatalogVisible(true);
    setCatalogLoading(true);
    try {
      const result = await getServiceCatalogApi();
      setCatalogItems(result.data);
    } catch {
      setCatalogItems([]);
    } finally {
      setCatalogLoading(false);
    }
  };

  const addFromCatalog = (ci: ServiceCatalogItemResponse) => {
    const row: EstimateItem = {
      id: Date.now().toString(),
      service: ci.name || '',
      description: ci.description || '',
      qty: 1,
      price: ci.defaultUnitPrice ?? 0,
    };
    const blank = items.length === 1 && !items[0].service.trim() && !items[0].price;
    setItems(blank ? [row] : [...items, row]);
    setCatalogVisible(false);
    setCatalogSearch('');
  };

  const filteredCatalog = catalogSearch.trim()
    ? catalogItems.filter(i => {
        const q = catalogSearch.trim().toLowerCase();
        return (i.name || '').toLowerCase().includes(q) || (i.category || '').toLowerCase().includes(q);
      })
    : catalogItems;

  // ── Attachments ──
  const pickAttachment = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      setAttachments(prev => [
        ...prev,
        ...result.assets.map(a => ({ uri: a.uri, name: a.name, mimeType: a.mimeType })),
      ]);
    } catch {
      Alert.alert('Could not attach file', 'Something went wrong selecting the file.');
    }
  };

  const removeAttachment = (i: number) => setAttachments(prev => prev.filter((_, idx) => idx !== i));

  // ── Money math ──
  const subtotal = round2(items.reduce((acc, i) => acc + i.qty * i.price, 0));
  const taxRateNum = parseFloat(taxRate) || 0;
  const discountInput = parseFloat(discountValue) || 0;
  const rawDiscount =
    discountType === 'percent' ? round2((subtotal * discountInput) / 100) : round2(discountInput);
  const discountAmount = Math.min(Math.max(rawDiscount, 0), subtotal);
  const taxableAmount = Math.max(0, round2(subtotal - discountAmount));
  const taxAmount = round2((taxableAmount * taxRateNum) / 100);
  const total = round2(taxableAmount + taxAmount);
  const depositInput = parseFloat(depositValue) || 0;
  const depositAmount =
    depositType === 'percent'
      ? Math.min(round2((total * depositInput) / 100), total)
      : depositType === 'fixed'
        ? Math.min(round2(depositInput), total)
        : 0;

  // ── Validation ──
  const lineItemErrors = useMemo(() => {
    const map: Record<string, LineItemErrors> = {};
    items.forEach(i => { map[i.id] = validateEstimateLineItem(i); });
    return map;
  }, [items]);

  const itemsError = hasValidLineItem(items)
    ? null
    : 'Add at least one item with a service name, quantity and price.';
  const taxError = validateTaxRate(taxRate);
  const discountError = validateDiscount(discountValue, discountType, subtotal);
  const depositError = validateDeposit(depositValue, depositType);
  const datesError = validateEstimateDates(issuedOn, expiresOn);
  const hasErrors =
    !customerId ||
    !!itemsError ||
    !!taxError ||
    !!discountError ||
    !!depositError ||
    !!datesError ||
    Object.values(lineItemErrors).some(e => e.service || e.qty || e.price);

  // ── Date picker ──
  const onPickDate = (_event: DateTimePickerEvent, selected?: Date) => {
    const picker = activePicker;
    if (Platform.OS !== 'ios') setActivePicker(null);
    if (!selected) return;
    markTouched('dates');
    if (picker === 'issue') {
      setIssuedOn(selected);
      if (expiresOn < selected) setExpiresOn(addDays(selected, 30));
    } else if (picker === 'expiry') {
      if (selected < issuedOn) {
        Alert.alert('Invalid date', 'Valid-until date must be on or after the issue date.');
        return;
      }
      setExpiresOn(selected);
    }
  };

  // ── Submit ──
  const buildLineItems = (): EstimateLineItemRequest[] =>
    items
      .filter(i => i.service.trim() && i.qty > 0)
      .map((i, idx) => ({
        sortOrder: idx,
        serviceName: i.service.trim(),
        description: i.description.trim(),
        quantity: i.qty,
        unitPrice: i.price,
      }));

  const handleSubmit = async (share: boolean) => {
    setSubmitAttempted(true);
    if (hasErrors) {
      Alert.alert(
        'Fix the highlighted fields',
        !customerId
          ? 'No customer is linked. Open this screen from a customer profile.'
          : 'Some details need attention before saving.'
      );
      return;
    }
    setSubmitting(true);
    showLoader();
    try {
      const payload: CreateEstimateRequest = {
        customerId,
        status: 'draft',
        issuedOn: toDateOnly(issuedOn),
        expiresOn: toDateOnly(expiresOn),
        taxRate: taxRateNum,
        discountAmount,
        title: title.trim() || null,
        notes: notes.trim() || null,
        internalNotes: internalNotes.trim() || null,
        depositType,
        depositValue: depositInput,
        lineItems: buildLineItems(),
      };
      const created = await createEstimateApi(payload);

      let failedUploads = 0;
      if (created.id && attachments.length) {
        for (const file of attachments) {
          try {
            await uploadEstimateAttachmentApi(created.id, file);
          } catch {
            failedUploads += 1;
          }
        }
      }

      let shareUrl = '';
      if (share && created.id) {
        const sent = await sendEstimateApi(created.id);
        shareUrl = buildPublicQuoteUrl(sent.publicToken);
      }

      hideLoader();
      setSubmitting(false);

      if (failedUploads > 0) {
        Alert.alert(
          'Partial upload',
          `${failedUploads} attachment(s) failed to upload, but the estimate was saved.`
        );
      }

      if (share) {
        if (shareUrl) {
          try {
            await Share.share({ message: `Hi ${customerName}, here's your quote from us: ${shareUrl}` });
          } catch {
            /* dismissed */
          }
        }
        Alert.alert('Quote sent', 'Share the link with your customer any time.', [
          { text: 'Done', onPress: () => router.back() },
        ]);
      } else {
        Alert.alert('Draft saved', 'Your estimate draft has been saved.', [
          { text: 'Done', onPress: () => router.back() },
        ]);
      }
    } catch (error: any) {
      hideLoader();
      setSubmitting(false);
      Alert.alert('Something went wrong', error?.message || 'Unable to save the estimate.');
    }
  };

  // ── KPI helpers ──
  const validDays = Math.round((expiresOn.getTime() - issuedOn.getTime()) / 86_400_000);
  const filledItems = items.filter(i => i.service.trim()).length;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={s.container}>

      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity style={s.iconBtn} onPress={() => router.back()}>
          <ChevronLeft size={20} color="#64748b" />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>NEW QUOTE</Text>
          <Text style={s.headerSub}>for {customerName}</Text>
        </View>
        <View style={s.totalPill}>
          <Text style={s.totalPillText}>{formatCurrency(total)}</Text>
        </View>
      </View>

      {/* ── KPI Strip ── */}
      <View style={s.kpiStrip}>
        <View style={s.kpiItem}>
          <Text style={s.kpiValue}>{filledItems}</Text>
          <Text style={s.kpiLabel}>Services</Text>
        </View>
        <View style={s.kpiDiv} />
        <View style={s.kpiItem}>
          <Text style={s.kpiValue}>{formatCurrency(subtotal)}</Text>
          <Text style={s.kpiLabel}>Subtotal</Text>
        </View>
        <View style={s.kpiDiv} />
        <View style={s.kpiItem}>
          <Text style={[s.kpiValue, discountAmount > 0 && { color: '#d97706' }]}>
            {discountAmount > 0 ? `−${formatCurrency(discountAmount)}` : '—'}
          </Text>
          <Text style={s.kpiLabel}>Discount</Text>
        </View>
        <View style={s.kpiDiv} />
        <View style={s.kpiItem}>
          <Text style={s.kpiValue}>{validDays}d</Text>
          <Text style={s.kpiLabel}>Valid For</Text>
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
        >

          {/* ── 1. Quote Identity ── */}
          <SectionCard title="Quote Details" accent="#2563eb" subtitle="Client, title and validity period">

            {/* Customer chip */}
            <View style={s.clientRow}>
              <View style={s.clientAvatar}>
                <User size={17} color="white" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.clientName}>{customerName}</Text>
                <Text style={s.clientSub}>Linked client</Text>
              </View>
              <View style={s.linkedChip}>
                <Text style={s.linkedChipText}>LINKED</Text>
              </View>
            </View>

            <View style={s.fieldSep} />

            {/* Title */}
            <View style={s.inputRow}>
              <Tag size={15} color="#cbd5e1" />
              <TextInput
                style={s.fieldInput}
                placeholder="Quote title (optional) — e.g. Spring Lawn Package"
                placeholderTextColor="#cbd5e1"
                value={title}
                maxLength={120}
                onChangeText={setTitle}
              />
            </View>

            <View style={s.fieldSep} />

            {/* Dates */}
            <View style={s.datesRow}>
              <TouchableOpacity
                style={[s.dateField, activePicker === 'issue' && s.dateFieldActive]}
                onPress={() => setActivePicker(activePicker === 'issue' ? null : 'issue')}
                activeOpacity={0.7}
              >
                <CalendarDays size={13} color={activePicker === 'issue' ? '#2563eb' : '#94a3b8'} />
                <View style={{ marginLeft: 8 }}>
                  <Text style={s.dateMeta}>ISSUE DATE</Text>
                  <Text style={[s.dateVal, activePicker === 'issue' && { color: '#2563eb' }]}>
                    {formatDateLabel(issuedOn)}
                  </Text>
                </View>
              </TouchableOpacity>

              <View style={s.dateConnector}>
                <View style={s.dateConnectorLine} />
                <Text style={s.dateConnectorText}>{validDays}d</Text>
                <View style={s.dateConnectorLine} />
              </View>

              <TouchableOpacity
                style={[s.dateField, activePicker === 'expiry' && s.dateFieldActive]}
                onPress={() => setActivePicker(activePicker === 'expiry' ? null : 'expiry')}
                activeOpacity={0.7}
              >
                <CalendarDays size={13} color={activePicker === 'expiry' ? '#2563eb' : '#94a3b8'} />
                <View style={{ marginLeft: 8 }}>
                  <Text style={s.dateMeta}>VALID UNTIL</Text>
                  <Text style={[s.dateVal, activePicker === 'expiry' && { color: '#2563eb' }]}>
                    {formatDateLabel(expiresOn)}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {activePicker && (
              <View style={s.pickerWrap}>
                <DateTimePicker
                  mode="date"
                  value={activePicker === 'issue' ? issuedOn : expiresOn}
                  display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
                  minimumDate={activePicker === 'expiry' ? issuedOn : undefined}
                  onChange={onPickDate}
                  accentColor="#2563eb"
                  themeVariant="light"
                />
                {Platform.OS === 'ios' && (
                  <TouchableOpacity style={s.pickerDone} onPress={() => setActivePicker(null)}>
                    <Text style={s.pickerDoneText}>Done</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            {showError('dates') && datesError ? <Text style={s.fieldErr}>{datesError}</Text> : null}
          </SectionCard>

          {/* ── 2. Services ── */}
          <View style={s.servicesHeader}>
            <View>
              <Text style={s.servicesTitle}>Services</Text>
              <Text style={s.servicesCount}>
                {items.length} {items.length === 1 ? 'line item' : 'line items'}
              </Text>
            </View>
            <TouchableOpacity style={s.catalogBtn} onPress={openCatalog}>
              <BookMarked size={15} color="#2563eb" />
              <Text style={s.catalogBtnText}>Add from Catalog</Text>
            </TouchableOpacity>
          </View>

          {items.map((item, index) => {
            const lineTotal = round2(item.qty * item.price);
            const errs = lineItemErrors[item.id] || {};
            const rt = showError(`li-${item.id}`);
            const accentColor = ITEM_ACCENTS[index % ITEM_ACCENTS.length];
            return (
              <View key={item.id} style={s.itemCard}>

                {/* Colour bar at top — unique per item */}
                <View style={[s.itemAccentBar, { backgroundColor: accentColor }]} />

                {/* Card header: "SERVICE 01" label + delete */}
                <View style={s.itemCardHead}>
                  <View style={[s.itemIndexChip, { backgroundColor: accentColor + '18' }]}>
                    <Text style={[s.itemIndexText, { color: accentColor }]}>
                      SERVICE {String(index + 1).padStart(2, '0')}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => removeItem(item.id)}
                    style={s.itemDel}
                    disabled={items.length === 1}
                  >
                    <Trash2 size={15} color={items.length === 1 ? '#e2e8f0' : '#94a3b8'} />
                  </TouchableOpacity>
                </View>

                {/* ── Service Name ── */}
                <View style={s.fieldGroup}>
                  <Text style={s.fieldLabel}>
                    Service Name <Text style={s.fieldRequired}>*</Text>
                  </Text>
                  <View style={[s.fieldBox, rt && errs.service ? s.fieldBoxErr : null]}>
                    <TextInput
                      style={s.fieldBoxText}
                      placeholder="e.g. Lawn Mowing, AC Repair, Deep Cleaning…"
                      placeholderTextColor="#c8d5e0"
                      value={item.service}
                      onChangeText={val => {
                        updateItem(item.id, 'service', val);
                        markTouched(`li-${item.id}`);
                      }}
                    />
                  </View>
                  {rt && errs.service ? <Text style={s.fieldErr}>{errs.service}</Text> : null}
                </View>

                {/* ── Description ── */}
                <View style={s.fieldGroup}>
                  <View style={s.fieldLabelRow}>
                    <Text style={s.fieldLabel}>Description</Text>
                    <View style={s.optionalBadge}>
                      <Text style={s.optionalText}>Optional</Text>
                    </View>
                  </View>
                  <View style={s.textAreaBox}>
                    <TextInput
                      style={s.textAreaText}
                      placeholder="What does this service include? Scope, materials, time, warranty…"
                      placeholderTextColor="#c8d5e0"
                      multiline
                      textAlignVertical="top"
                      value={item.description}
                      onChangeText={val => updateItem(item.id, 'description', val)}
                    />
                  </View>
                </View>

                {/* ── Qty × Price ── */}
                <View style={s.calcStrip}>
                  <View style={[s.calcField, rt && errs.qty ? s.calcFieldErr : null]}>
                    <Text style={s.calcFieldLabel}>QTY</Text>
                    <TextInput
                      style={s.calcFieldInput}
                      keyboardType="numeric"
                      value={item.qty ? item.qty.toString() : ''}
                      placeholder="1"
                      placeholderTextColor="#cbd5e1"
                      onChangeText={val => {
                        updateItem(item.id, 'qty', parseFloat(val) || 0);
                        markTouched(`li-${item.id}`);
                      }}
                    />
                  </View>
                  <Text style={s.calcOp}>×</Text>
                  <View style={[s.calcField, s.calcFieldFlex, rt && errs.price ? s.calcFieldErr : null]}>
                    <Text style={s.calcFieldLabel}>UNIT PRICE</Text>
                    <TextInput
                      style={s.calcFieldInput}
                      keyboardType="numeric"
                      value={item.price ? item.price.toString() : ''}
                      placeholder="0.00"
                      placeholderTextColor="#cbd5e1"
                      onChangeText={val => {
                        updateItem(item.id, 'price', parseFloat(val) || 0);
                        markTouched(`li-${item.id}`);
                      }}
                    />
                  </View>
                  <View
                    style={[
                      s.calcTotal,
                      { borderColor: accentColor + '50', backgroundColor: accentColor + '0E' },
                    ]}
                  >
                    <Text style={[s.calcTotalLabel, { color: accentColor }]}>TOTAL</Text>
                    <Text style={[s.calcTotalVal, { color: accentColor }]}>
                      {formatCurrency(lineTotal)}
                    </Text>
                  </View>
                </View>

                {rt && (errs.qty || errs.price) ? (
                  <Text style={[s.fieldErr, { marginHorizontal: 18, marginBottom: 14 }]}>
                    {errs.qty || errs.price}
                  </Text>
                ) : null}
              </View>
            );
          })}

          {/* Add item button */}
          <TouchableOpacity style={s.addItemBtn} onPress={addItem}>
            <Plus size={17} color="#64748b" />
            <Text style={s.addItemText}>Add Another Service</Text>
          </TouchableOpacity>

          {submitAttempted && itemsError ? (
            <Text style={s.fieldErrCenter}>{itemsError}</Text>
          ) : null}

          {/* ── 3. Pricing ── */}
          <SectionCard title="Pricing" accent="#f59e0b" subtitle="Discount, tax and deposit">

            {/* Discount */}
            <View style={s.priceRow}>
              <View style={s.priceLabelCol}>
                <Text style={s.priceLabel}>Discount</Text>
                <Text style={s.priceHint}>Applied before tax</Text>
              </View>
              <View style={s.priceCtrl}>
                <View style={s.typeToggle}>
                  <TouchableOpacity
                    style={[s.typeBtn, discountType === 'fixed' && s.typeBtnOn]}
                    onPress={() => setDiscountType('fixed')}
                  >
                    <Text style={[s.typeBtnTxt, discountType === 'fixed' && s.typeBtnTxtOn]}>$</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.typeBtn, discountType === 'percent' && s.typeBtnOn]}
                    onPress={() => setDiscountType('percent')}
                  >
                    <Text style={[s.typeBtnTxt, discountType === 'percent' && s.typeBtnTxtOn]}>%</Text>
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={[s.priceInput, showError('discount') && discountError && s.priceInputErr]}
                  keyboardType="numeric"
                  value={discountValue}
                  placeholder="0"
                  placeholderTextColor="#cbd5e1"
                  onChangeText={val => { setDiscountValue(val); markTouched('discount'); }}
                />
              </View>
            </View>
            {showError('discount') && discountError ? (
              <Text style={s.fieldErrRight}>{discountError}</Text>
            ) : null}

            <View style={s.priceSep} />

            {/* Tax */}
            <View style={s.priceRow}>
              <View style={s.priceLabelCol}>
                <Text style={s.priceLabel}>Tax Rate</Text>
                <Text style={s.priceHint}>Applied on discounted subtotal</Text>
              </View>
              <View style={s.priceCtrl}>
                <View style={[s.typeToggle, { opacity: 0 }]}>
                  <View style={s.typeBtn}><Text style={s.typeBtnTxt}>%</Text></View>
                  <View style={s.typeBtn}><Text style={s.typeBtnTxt}>%</Text></View>
                </View>
                <TextInput
                  style={[s.priceInput, showError('tax') && taxError && s.priceInputErr]}
                  keyboardType="numeric"
                  value={taxRate}
                  placeholder="0"
                  placeholderTextColor="#cbd5e1"
                  onChangeText={val => { setTaxRate(val); markTouched('tax'); }}
                />
              </View>
            </View>
            {showError('tax') && taxError ? (
              <Text style={s.fieldErrRight}>{taxError}</Text>
            ) : null}

            <View style={s.priceSep} />

            {/* Deposit */}
            <View style={s.priceRow}>
              <View style={s.priceLabelCol}>
                <Text style={s.priceLabel}>Deposit</Text>
                <Text style={s.priceHint}>Upfront payment required</Text>
              </View>
              <View style={s.priceCtrl}>
                <View style={s.typeToggle}>
                  <TouchableOpacity
                    style={[s.typeBtn, depositType === 'none' && s.typeBtnOn]}
                    onPress={() => setDepositType('none')}
                  >
                    <Text style={[s.typeBtnTxt, depositType === 'none' && s.typeBtnTxtOn]}>Off</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.typeBtn, depositType === 'percent' && s.typeBtnOn]}
                    onPress={() => setDepositType('percent')}
                  >
                    <Text style={[s.typeBtnTxt, depositType === 'percent' && s.typeBtnTxtOn]}>%</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.typeBtn, depositType === 'fixed' && s.typeBtnOn]}
                    onPress={() => setDepositType('fixed')}
                  >
                    <Text style={[s.typeBtnTxt, depositType === 'fixed' && s.typeBtnTxtOn]}>$</Text>
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={[
                    s.priceInput,
                    depositType === 'none' && s.priceInputMuted,
                    showError('deposit') && depositError && s.priceInputErr,
                  ]}
                  keyboardType="numeric"
                  editable={depositType !== 'none'}
                  value={depositType === 'none' ? '' : depositValue}
                  placeholder="0"
                  placeholderTextColor="#cbd5e1"
                  onChangeText={val => { setDepositValue(val); markTouched('deposit'); }}
                />
              </View>
            </View>
            {showError('deposit') && depositError ? (
              <Text style={s.fieldErrRight}>{depositError}</Text>
            ) : null}

            {/* Live breakdown inside the card */}
            <View style={s.breakdownCard}>
              <View style={s.breakRow}>
                <Text style={s.breakLabel}>Subtotal</Text>
                <Text style={s.breakVal}>{formatCurrency(subtotal)}</Text>
              </View>
              {discountAmount > 0 && (
                <View style={s.breakRow}>
                  <Text style={[s.breakLabel, { color: '#d97706' }]}>
                    Discount{discountType === 'percent' ? ` (${discountInput}%)` : ''}
                  </Text>
                  <Text style={[s.breakVal, { color: '#d97706' }]}>−{formatCurrency(discountAmount)}</Text>
                </View>
              )}
              {taxAmount > 0 && (
                <View style={s.breakRow}>
                  <Text style={[s.breakLabel, { color: '#64748b' }]}>Tax ({taxRate}%)</Text>
                  <Text style={[s.breakVal, { color: '#64748b' }]}>+{formatCurrency(taxAmount)}</Text>
                </View>
              )}
              <View style={s.breakDivider} />
              <View style={s.breakTotalRow}>
                <Text style={s.breakTotalLabel}>Quote Total</Text>
                <Text style={s.breakTotalVal}>{formatCurrency(total)}</Text>
              </View>
              {depositAmount > 0 && (
                <View style={[s.breakRow, { marginTop: 10 }]}>
                  <Text style={[s.breakLabel, { color: '#2563eb' }]}>
                    Deposit due{depositType === 'percent' ? ` (${depositInput}%)` : ''}
                  </Text>
                  <Text style={[s.breakVal, { color: '#2563eb', fontWeight: '900' }]}>
                    {formatCurrency(depositAmount)}
                  </Text>
                </View>
              )}
            </View>
          </SectionCard>

          {/* ── 4. Notes ── */}
          <SectionCard title="Notes" accent="#8b5cf6" subtitle="Visible to customer or internal only">
            {/* Tab toggle */}
            <View style={s.notesTabs}>
              <TouchableOpacity
                style={[s.notesTab, notesTab === 'customer' && s.notesTabOn]}
                onPress={() => setNotesTab('customer')}
              >
                <Text style={[s.notesTabTxt, notesTab === 'customer' && s.notesTabTxtOn]}>
                  Customer Message
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.notesTab, notesTab === 'internal' && s.notesTabOn]}
                onPress={() => setNotesTab('internal')}
              >
                <Text style={[s.notesTabTxt, notesTab === 'internal' && s.notesTabTxtOn]}>
                  Internal Notes
                </Text>
              </TouchableOpacity>
            </View>

            {notesTab === 'customer' ? (
              <TextInput
                style={s.notesInput}
                placeholder="Add terms, scope of work or a personal message — shown on the quote your customer receives."
                placeholderTextColor="#cbd5e1"
                multiline
                maxLength={1000}
                value={notes}
                onChangeText={setNotes}
              />
            ) : (
              <View style={s.internalNotesWrap}>
                <View style={s.internalBadge}>
                  <Text style={s.internalBadgeText}>🔒 PRIVATE — never shown to customer</Text>
                </View>
                <TextInput
                  style={s.notesInput}
                  placeholder="Notes for your team, cost breakdowns, reminders..."
                  placeholderTextColor="#cbd5e1"
                  multiline
                  maxLength={1000}
                  value={internalNotes}
                  onChangeText={setInternalNotes}
                />
              </View>
            )}
          </SectionCard>

          {/* ── 5. Attachments ── */}
          <SectionCard title="Attachments" accent="#10b981" subtitle="Photos or PDFs attached to the quote">
            {attachments.map((file, idx) => (
              <View key={`${file.uri}-${idx}`} style={s.attachRow}>
                <View style={s.attachIcon}>
                  <Paperclip size={14} color="#2563eb" />
                </View>
                <Text style={s.attachName} numberOfLines={1}>{file.name}</Text>
                <TouchableOpacity onPress={() => removeAttachment(idx)} style={s.attachDel}>
                  <X size={14} color="#94a3b8" />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity style={s.attachPickBtn} onPress={pickAttachment}>
              <Upload size={16} color="#2563eb" />
              <Text style={s.attachPickTxt}>
                {attachments.length > 0 ? 'Add More Files' : 'Attach Photos or PDF'}
              </Text>
            </TouchableOpacity>
          </SectionCard>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Fixed Footer ── */}
      <View style={s.footer}>
        <View style={s.footerSummary}>
          <View>
            <Text style={s.footerSummaryLabel}>Quote Total</Text>
            {depositAmount > 0 && (
              <Text style={s.footerDepositLabel}>
                Deposit: {formatCurrency(depositAmount)}
              </Text>
            )}
          </View>
          <Text style={s.footerTotalVal}>{formatCurrency(total)}</Text>
        </View>
        <View style={s.footerBtns}>
          <TouchableOpacity
            style={[s.draftBtn, submitting && s.btnOff]}
            disabled={submitting}
            onPress={() => handleSubmit(false)}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#475569" />
            ) : (
              <>
                <FileText size={16} color="#475569" />
                <Text style={s.draftBtnTxt}>Save Draft</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.sendBtn, submitting && s.btnOff]}
            disabled={submitting}
            onPress={() => handleSubmit(true)}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Send size={18} color="white" />
                <Text style={s.sendBtnTxt}>Send to Customer</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Catalog Modal ── */}
      <Modal
        visible={catalogVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setCatalogVisible(false)}
      >
        <View style={s.catalogOverlay}>
          <View style={s.catalogSheet}>
            <View style={s.catalogHandle} />
            <View style={s.catalogHead}>
              <View>
                <Text style={s.catalogEyebrow}>SERVICE CATALOG</Text>
                <Text style={s.catalogTitle}>Add from Catalog</Text>
              </View>
              <TouchableOpacity style={s.catalogCloseBtn} onPress={() => setCatalogVisible(false)}>
                <X size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={s.catalogSearch}>
              <Search size={15} color="#94a3b8" />
              <TextInput
                style={s.catalogSearchInput}
                placeholder="Search services or categories..."
                placeholderTextColor="#cbd5e1"
                value={catalogSearch}
                onChangeText={setCatalogSearch}
              />
            </View>

            {catalogLoading ? (
              <View style={s.catalogState}>
                <ActivityIndicator color="#2563eb" />
                <Text style={s.catalogStateText}>Loading your catalog...</Text>
              </View>
            ) : filteredCatalog.length === 0 ? (
              <View style={s.catalogState}>
                <BookMarked size={36} color="#e2e8f0" />
                <Text style={s.catalogEmptyTitle}>No saved services</Text>
                <Text style={s.catalogEmptySub}>
                  Go to Settings → Service Catalog to add reusable services.
                </Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
                {filteredCatalog.map(item => (
                  <TouchableOpacity
                    key={item.id}
                    style={s.catalogItem}
                    onPress={() => addFromCatalog(item)}
                    activeOpacity={0.7}
                  >
                    <View style={s.catalogItemIcon}>
                      <Tag size={15} color="#2563eb" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.catalogItemName}>{item.name}</Text>
                      {!!item.category?.trim() && (
                        <Text style={s.catalogItemCat}>{item.category}</Text>
                      )}
                    </View>
                    <Text style={s.catalogItemPrice}>
                      {item.defaultUnitPrice != null ? formatCurrency(item.defaultUnitPrice) : '—'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 12,
  },
  iconBtn: {
    width: 40,
    height: 40,
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 14, fontWeight: '900', color: '#0f172a', letterSpacing: 1.5 },
  headerSub: { fontSize: 12, fontWeight: '600', color: '#94a3b8', marginTop: 1 },
  totalPill: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  totalPillText: { fontSize: 14, fontWeight: '900', color: '#2563eb' },

  // KPI strip
  kpiStrip: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  kpiItem: { flex: 1, alignItems: 'center', gap: 3 },
  kpiDiv: { width: 1, backgroundColor: '#e2e8f0', marginVertical: 4 },
  kpiValue: { fontSize: 14, fontWeight: '900', color: '#0f172a' },
  kpiLabel: { fontSize: 10, fontWeight: '700', color: '#94a3b8', letterSpacing: 0.3 },

  // Scroll
  scroll: { padding: 16, paddingBottom: 220 },

  // Client row (inside Quote Details card)
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 14,
    marginBottom: 4,
  },
  clientAvatar: {
    width: 40,
    height: 40,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clientName: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  clientSub: { fontSize: 12, fontWeight: '600', color: '#94a3b8', marginTop: 1 },
  linkedChip: {
    backgroundColor: '#d1fae5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  linkedChipText: { fontSize: 10, fontWeight: '900', color: '#059669', letterSpacing: 0.5 },

  // Field separator inside cards
  fieldSep: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 12 },

  // Generic input row inside cards
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 4,
  },
  fieldInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    padding: 0,
  },

  // Dates
  datesRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  dateField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dateFieldActive: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  dateMeta: { fontSize: 9, fontWeight: '900', color: '#94a3b8', letterSpacing: 0.8 },
  dateVal: { fontSize: 13, fontWeight: '800', color: '#0f172a', marginTop: 3 },
  dateConnector: {
    alignItems: 'center',
    gap: 3,
  },
  dateConnectorLine: { width: 1, height: 8, backgroundColor: '#e2e8f0' },
  dateConnectorText: { fontSize: 10, fontWeight: '800', color: '#94a3b8' },
  pickerWrap: {
    marginTop: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    padding: 8,
  },
  pickerDone: { alignSelf: 'flex-end', paddingHorizontal: 20, paddingVertical: 10 },
  pickerDoneText: { fontSize: 15, fontWeight: '900', color: '#2563eb' },

  // Services section
  servicesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  servicesTitle: { fontSize: 16, fontWeight: '900', color: '#0f172a' },
  servicesCount: { fontSize: 12, fontWeight: '600', color: '#94a3b8', marginTop: 2 },
  catalogBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  catalogBtnText: { fontSize: 13, fontWeight: '800', color: '#2563eb' },

  // ── Line item card ──────────────────────────────────────────
  itemCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    marginBottom: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  itemAccentBar: { height: 4 },
  itemCardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
  },
  itemIndexChip: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  itemIndexText: { fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  itemDel: { padding: 6 },

  // Labelled form fields inside each item card
  fieldGroup: { paddingHorizontal: 16, marginBottom: 14 },
  fieldLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  fieldLabel: { fontSize: 12, fontWeight: '800', color: '#475569', letterSpacing: 0.2,paddingBottom: 5},
  fieldRequired: { color: '#ef4444' },
  fieldBox: {
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  fieldBoxErr: { borderColor: '#fca5a5', backgroundColor: '#fff7f7' },
  fieldBoxText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
    padding: 0,
  },
  textAreaBox: {
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 80,
  },
  textAreaText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0f172a',
    padding: 0,
    lineHeight: 22,
    minHeight: 60,
  },
  optionalBadge: {
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  optionalText: { fontSize: 10, fontWeight: '700', color: '#94a3b8' },

  // Qty × Price strip at the bottom of each card
  calcStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  calcField: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 68,
  },
  calcFieldFlex: { flex: 1 },
  calcFieldErr: { borderColor: '#fca5a5', backgroundColor: '#fff7f7' },
  calcFieldLabel: { fontSize: 9, fontWeight: '900', color: '#94a3b8', letterSpacing: 0.8, marginBottom: 5 },
  calcFieldInput: { fontSize: 17, fontWeight: '900', color: '#0f172a', padding: 0 },
  calcOp: { fontSize: 18, fontWeight: '700', color: '#cbd5e1' },
  calcTotal: {
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 82,
    alignItems: 'flex-end',
  },
  calcTotalLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 0.8, marginBottom: 5 },
  calcTotalVal: { fontSize: 17, fontWeight: '900' },

  // Add item button
  addItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#cbd5e1',
    marginBottom: 20,
    backgroundColor: 'white',
  },
  addItemText: { fontSize: 14, fontWeight: '700', color: '#64748b' },

  // Pricing rows inside SectionCard
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  priceLabelCol: { flex: 1 },
  priceLabel: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  priceHint: { fontSize: 11, fontWeight: '600', color: '#94a3b8', marginTop: 2 },
  priceCtrl: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  typeToggle: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 3,
    gap: 2,
  },
  typeBtn: {
    minWidth: 34,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  typeBtnOn: { backgroundColor: '#2563eb' },
  typeBtnTxt: { fontSize: 12, fontWeight: '900', color: '#64748b' },
  typeBtnTxtOn: { color: 'white' },
  priceInput: {
    minWidth: 72,
    textAlign: 'right',
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
    padding: 0,
  },
  priceInputMuted: { color: '#cbd5e1' },
  priceInputErr: { color: '#dc2626' },
  priceSep: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 14 },

  // Live breakdown inside Pricing card
  breakdownCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    marginTop: 20,
  },
  breakRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  breakLabel: { fontSize: 13, fontWeight: '700', color: '#64748b' },
  breakVal: { fontSize: 13, fontWeight: '800', color: '#0f172a' },
  breakDivider: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 10 },
  breakTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  breakTotalLabel: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  breakTotalVal: { fontSize: 24, fontWeight: '900', color: '#2563eb', letterSpacing: -0.5 },

  // Notes
  notesTabs: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
    padding: 3,
    gap: 3,
    marginBottom: 16,
    marginTop: 4,
  },
  notesTab: {
    flex: 1,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notesTabOn: { backgroundColor: 'white', shadowColor: '#0f172a', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  notesTabTxt: { fontSize: 13, fontWeight: '700', color: '#94a3b8' },
  notesTabTxtOn: { color: '#0f172a', fontWeight: '800' },
  notesInput: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0f172a',
    minHeight: 90,
    textAlignVertical: 'top',
    padding: 0,
    lineHeight: 22,
  },
  internalNotesWrap: { gap: 10 },
  internalBadge: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  internalBadgeText: { fontSize: 11, fontWeight: '800', color: '#92400e' },

  // Attachments
  attachRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 8,
  },
  attachIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachName: { flex: 1, fontSize: 13, fontWeight: '700', color: '#0f172a' },
  attachDel: { padding: 4 },
  attachPickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#bfdbfe',
    backgroundColor: '#f8fafc',
    marginTop: 4,
  },
  attachPickTxt: { fontSize: 14, fontWeight: '800', color: '#2563eb' },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
    shadowColor: '#0f172a',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 10,
  },
  footerSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  footerSummaryLabel: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  footerDepositLabel: { fontSize: 11, fontWeight: '700', color: '#2563eb', marginTop: 2 },
  footerTotalVal: { fontSize: 28, fontWeight: '900', color: '#0f172a', letterSpacing: -0.5 },
  footerBtns: { flexDirection: 'row', gap: 12 },
  draftBtn: {
    height: 56,
    paddingHorizontal: 18,
    backgroundColor: '#f8fafc',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  draftBtnTxt: { fontSize: 14, fontWeight: '800', color: '#475569' },
  sendBtn: {
    flex: 1,
    height: 56,
    backgroundColor: '#2563eb',
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#2563eb',
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 6,
  },
  sendBtnTxt: { fontSize: 16, fontWeight: '900', color: 'white' },
  btnOff: { opacity: 0.55 },

  // Catalog modal
  catalogOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
  catalogSheet: {
    backgroundColor: 'white',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 44 : 28,
  },
  catalogHandle: {
    width: 48,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#e2e8f0',
    alignSelf: 'center',
    marginBottom: 20,
  },
  catalogHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  catalogEyebrow: { fontSize: 10, fontWeight: '900', color: '#94a3b8', letterSpacing: 1.2 },
  catalogTitle: { fontSize: 20, fontWeight: '900', color: '#0f172a', marginTop: 4 },
  catalogCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  catalogSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 48,
    marginBottom: 16,
  },
  catalogSearchInput: { flex: 1, fontSize: 14, fontWeight: '600', color: '#0f172a', padding: 0 },
  catalogState: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  catalogStateText: { fontSize: 14, fontWeight: '700', color: '#94a3b8' },
  catalogEmptyTitle: { fontSize: 16, fontWeight: '900', color: '#0f172a' },
  catalogEmptySub: { fontSize: 13, fontWeight: '600', color: '#94a3b8', textAlign: 'center', maxWidth: 260 },
  catalogItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  catalogItemIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  catalogItemName: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  catalogItemCat: { fontSize: 12, fontWeight: '600', color: '#94a3b8', marginTop: 2 },
  catalogItemPrice: { fontSize: 15, fontWeight: '900', color: '#2563eb' },

  // Errors
  fieldErr: { fontSize: 12, fontWeight: '700', color: '#dc2626', marginTop: 6 },
  fieldErrRight: { fontSize: 12, fontWeight: '700', color: '#dc2626', textAlign: 'right', marginTop: 4 },
  fieldErrCenter: { fontSize: 13, fontWeight: '700', color: '#dc2626', textAlign: 'center', marginBottom: 16 },
});

export default EstimateCreatorScreen;
