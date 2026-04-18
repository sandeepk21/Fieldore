import { router } from 'expo-router';
import {
    Calendar,
    ChevronDown,
    ChevronLeft,
    LucideIcon,
    Plus,
    Trash2,
    X
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
    Alert,
    Dimensions,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

// --- Types ---
type StepType = 'basic' | 'lineItems' | 'review';

interface BasicInfo {
  invoiceNum: string;
  customer: string;
  customerId?: string;
  issueDate: string;
  dueDate: string;
  jobReference: string;
}

interface LineItem {
  id: string;
  title: string;
  description: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  taxable: boolean;
}

interface InvoiceFormData {
  basicInfo: BasicInfo;
  lineItems: LineItem[];
  taxRate: string;
  discount: string;
  notes: string;
}

// --- Mock Customers ---
const MOCK_CUSTOMERS = [
  { id: '1', name: 'Sarah Johnson', email: 'sarah@example.com', phone: '+1 555 0101' },
  { id: '2', name: 'Mike Torres', email: 'mike@example.com', phone: '+1 555 0102' },
  { id: '3', name: 'Emma Davis', email: 'emma@example.com', phone: '+1 555 0103' },
  { id: '4', name: 'Alex Chen', email: 'alex@example.com', phone: '+1 555 0104' },
];

// --- Mock Jobs ---
const MOCK_JOBS = [
  { id: '1', code: 'JOB-PL-2031', title: 'Pipe Repair - Main Line' },
  { id: '2', code: 'JOB-EL-2032', title: 'Electrical Rewiring' },
  { id: '3', code: 'JOB-HV-2030', title: 'HVAC Installation' },
];

// --- Helpers ---
const parseMoney = (value: string) => {
  const sanitized = value.replace(/[^0-9.]/g, '');
  const parsed = parseFloat(sanitized);
  return isFinite(parsed) ? parsed : 0;
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);

const calculateTotals = (items: LineItem[], taxRate: string, discount: string) => {
  const taxableTotal = items
    .filter((item) => item.taxable)
    .reduce((sum, item) => sum + parseFloat(item.quantity || '0') * parseMoney(item.unitPrice), 0);

  const nonTaxableTotal = items
    .filter((item) => !item.taxable)
    .reduce((sum, item) => sum + parseFloat(item.quantity || '0') * parseMoney(item.unitPrice), 0);

  const subtotal = taxableTotal + nonTaxableTotal;
  const discountAmount = parseMoney(discount);
  const taxAmount = Math.max(0, taxableTotal - discountAmount) * (parseMoney(taxRate) / 100);
  const grandTotal = subtotal - discountAmount + taxAmount;

  return {
    subtotal,
    discountAmount,
    taxAmount,
    grandTotal,
    taxableTotal,
  };
};

// --- Components ---
interface StepIndicatorProps {
  currentStep: StepType;
}

const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep }) => {
  const steps: Array<{ key: StepType; label: string; num: number }> = [
    { key: 'basic', label: 'Basic Info', num: 1 },
    { key: 'lineItems', label: 'Items', num: 2 },
    { key: 'review', label: 'Review', num: 3 },
  ];

  return (
    <View style={styles.stepIndicator}>
      {steps.map((step, idx) => {
        const isActive = step.key === currentStep;
        const isCompleted = steps.findIndex((s) => s.key === currentStep) > idx;

        return (
          <View key={step.key} style={styles.stepContainer}>
            <View
              style={[
                styles.stepCircle,
                isActive && styles.stepCircleActive,
                isCompleted && styles.stepCircleCompleted,
              ]}
            >
              <Text
                style={[
                  styles.stepNumber,
                  (isActive || isCompleted) && styles.stepNumberActive,
                ]}
              >
                {step.num}
              </Text>
            </View>
            <Text style={styles.stepLabel}>{step.label}</Text>
            {idx < steps.length - 1 && (
              <View
                style={[
                  styles.stepLine,
                  isCompleted && styles.stepLineCompleted,
                ]}
              />
            )}
          </View>
        );
      })}
    </View>
  );
};

interface InputFieldProps {
  label: string;
  value: string;
  onChangeText?: (value: string) => void;
  placeholder?: string;
  icon?: LucideIcon;
  editable?: boolean;
  keyboardType?: 'default' | 'numeric' | 'email-address';
  required?: boolean;
  error?: string;
  onPress?: () => void;
  showDropdown?: boolean;
}

const InputField: React.FC<InputFieldProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  icon: Icon,
  editable = true,
  keyboardType = 'default',
  required = false,
  error,
  onPress,
  showDropdown,
}) => (
  <View style={styles.inputWrapper}>
    <View style={styles.labelRow}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.required}>*</Text>}
      </Text>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
    <TouchableOpacity
      style={[styles.inputField, error && styles.inputFieldError, !editable && styles.inputFieldDisabled]}
      onPress={onPress}
      disabled={!editable && !onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      {Icon && <Icon size={16} color="#94a3b8" />}
      <TextInput
        style={styles.textInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#cbd5e1"
        editable={editable && !onPress}
        keyboardType={keyboardType}
      />
      {showDropdown && <ChevronDown size={16} color="#94a3b8" />}
    </TouchableOpacity>
  </View>
);

// --- Modal Components ---
interface CustomerPickerModalProps {
  visible: boolean;
  onSelect: (customer: any) => void;
  onClose: () => void;
}

const CustomerPickerModal: React.FC<CustomerPickerModalProps> = ({
  visible,
  onSelect,
  onClose,
}) => (
  <Modal visible={visible} animationType="slide" transparent={true}>
    <SafeAreaView style={styles.modal}>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>Select Customer</Text>
        <TouchableOpacity onPress={onClose}>
          <X size={24} color="#0f172a" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
        {MOCK_CUSTOMERS.map((customer) => (
          <TouchableOpacity
            key={customer.id}
            style={styles.modalItem}
            onPress={() => {
              onSelect(customer);
              onClose();
            }}
          >
            <View style={styles.modalItemContent}>
              <Text style={styles.modalItemTitle}>{customer.name}</Text>
              <Text style={styles.modalItemSubtitle}>{customer.email}</Text>
            </View>
            <ChevronDown size={16} color="#cbd5e1" style={{ transform: [{ rotate: '-90deg' }] }} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  </Modal>
);

interface JobPickerModalProps {
  visible: boolean;
  onSelect: (job: any) => void;
  onClose: () => void;
}

const JobPickerModal: React.FC<JobPickerModalProps> = ({ visible, onSelect, onClose }) => (
  <Modal visible={visible} animationType="slide" transparent={true}>
    <SafeAreaView style={styles.modal}>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>Select Job Reference</Text>
        <TouchableOpacity onPress={onClose}>
          <X size={24} color="#0f172a" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
        {MOCK_JOBS.map((job) => (
          <TouchableOpacity
            key={job.id}
            style={styles.modalItem}
            onPress={() => {
              onSelect(job);
              onClose();
            }}
          >
            <View style={styles.modalItemContent}>
              <Text style={styles.modalItemTitle}>{job.code}</Text>
              <Text style={styles.modalItemSubtitle}>{job.title}</Text>
            </View>
            <ChevronDown size={16} color="#cbd5e1" style={{ transform: [{ rotate: '-90deg' }] }} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  </Modal>
);

interface LineItemEditorModalProps {
  visible: boolean;
  item?: LineItem;
  onSave: (item: LineItem) => void;
  onClose: () => void;
}

const LineItemEditorModal: React.FC<LineItemEditorModalProps> = ({ visible, item, onSave, onClose }) => {
  const [formData, setFormData] = useState<LineItem>(
    item || {
      id: Date.now().toString(),
      title: '',
      description: '',
      quantity: '1',
      unit: 'hrs',
      unitPrice: '',
      taxable: true,
    }
  );

  const handleSave = () => {
    if (!formData.title.trim() || !formData.unitPrice.trim()) {
      Alert.alert('Missing Fields', 'Title and price are required');
      return;
    }
    onSave(formData);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <SafeAreaView style={styles.modal}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{item ? 'Edit Item' : 'Add Item'}</Text>
          <TouchableOpacity onPress={onClose}>
            <X size={24} color="#0f172a" />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContent}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            <InputField
              label="Item Title"
              value={formData.title}
              onChangeText={(val) => setFormData({ ...formData, title: val })}
              placeholder="e.g., Labor, Materials, Service"
              required={true}
            />

            <InputField
              label="Description"
              value={formData.description}
              onChangeText={(val) => setFormData({ ...formData, description: val })}
              placeholder="Additional details (optional)"
            />

            <View style={styles.row}>
              <View style={styles.fiftyCol}>
                <InputField
                  label="Quantity"
                  value={formData.quantity}
                  onChangeText={(val) => setFormData({ ...formData, quantity: val })}
                  keyboardType="numeric"
                  placeholder="1"
                  required={true}
                />
              </View>
              <View style={styles.fiftyCol}>
                <InputField
                  label="Unit"
                  value={formData.unit}
                  placeholder="hrs, pcs, lbs"
                  showDropdown={true}
                />
              </View>
            </View>

            <InputField
              label="Unit Price"
              value={formData.unitPrice}
              onChangeText={(val) => setFormData({ ...formData, unitPrice: val })}
              keyboardType="numeric"
              placeholder="0.00"
              required={true}
            />

            <View style={styles.taxableRow}>
              <Text style={styles.taxableLabel}>Taxable?</Text>
              <TouchableOpacity
                style={[styles.checkbox, formData.taxable && styles.checkboxActive]}
                onPress={() => setFormData({ ...formData, taxable: !formData.taxable })}
              >
                {formData.taxable && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Save Item</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

// --- Main Component ---
const InvoiceCreateWizardScreen: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<StepType>('basic');
  const [formData, setFormData] = useState<InvoiceFormData>({
    basicInfo: {
      invoiceNum: 'INV-2026-0483',
      customer: '',
      customerId: '',
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      jobReference: '',
    },
    lineItems: [],
    taxRate: '0',
    discount: '0',
    notes: '',
  });

  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showJobModal, setShowJobModal] = useState(false);
  const [showLineItemModal, setShowLineItemModal] = useState(false);
  const [editingLineItemId, setEditingLineItemId] = useState<string | null>(null);

  const totals = calculateTotals(formData.lineItems, formData.taxRate, formData.discount);

  const handleCustomerSelect = (customer: any) => {
    setFormData({
      ...formData,
      basicInfo: { ...formData.basicInfo, customer: customer.name, customerId: customer.id },
    });
  };

  const handleJobSelect = (job: any) => {
    setFormData({
      ...formData,
      basicInfo: { ...formData.basicInfo, jobReference: job.code },
    });
  };

  const handleAddLineItem = (item: LineItem) => {
    if (editingLineItemId) {
      setFormData({
        ...formData,
        lineItems: formData.lineItems.map((li) =>
          li.id === editingLineItemId ? item : li
        ),
      });
      setEditingLineItemId(null);
    } else {
      setFormData({
        ...formData,
        lineItems: [...formData.lineItems, item],
      });
    }
    setShowLineItemModal(false);
  };

  const handleRemoveLineItem = (id: string) => {
    setFormData({
      ...formData,
      lineItems: formData.lineItems.filter((item) => item.id !== id),
    });
  };

  const canProceedToNextStep = () => {
    if (currentStep === 'basic') {
      return formData.basicInfo.customer && formData.basicInfo.issueDate && formData.basicInfo.dueDate;
    }
    if (currentStep === 'lineItems') {
      return formData.lineItems.length > 0;
    }
    return true;
  };

  const handleSubmit = () => {
    Alert.alert('Success', 'Invoice created successfully!', [
      {
        text: 'View Invoice',
        onPress: () => router.push('./InvoicesListScreen'),
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ChevronLeft size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Invoice</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Step Indicator */}
      <StepIndicator currentStep={currentStep} />

      {/* Content */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {currentStep === 'basic' && (
            <View style={styles.stepContent}>
              <Text style={styles.sectionTitle}>Invoice Details</Text>

              <InputField
                label="Invoice Number"
                value={formData.basicInfo.invoiceNum}
                editable={false}
              />

              <InputField
                label="Customer"
                value={formData.basicInfo.customer}
                placeholder="Tap to select customer"
                onPress={() => setShowCustomerModal(true)}
                showDropdown={true}
                required={true}
              />

              <View style={styles.row}>
                <View style={styles.fiftyCol}>
                  <InputField
                    label="Issue Date"
                    value={formData.basicInfo.issueDate}
                    onChangeText={(val) =>
                      setFormData({
                        ...formData,
                        basicInfo: { ...formData.basicInfo, issueDate: val },
                      })
                    }
                    icon={Calendar}
                    required={true}
                  />
                </View>
                <View style={styles.fiftyCol}>
                  <InputField
                    label="Due Date"
                    value={formData.basicInfo.dueDate}
                    onChangeText={(val) =>
                      setFormData({
                        ...formData,
                        basicInfo: { ...formData.basicInfo, dueDate: val },
                      })
                    }
                    icon={Calendar}
                    required={true}
                  />
                </View>
              </View>

              <InputField
                label="Job Reference"
                value={formData.basicInfo.jobReference}
                placeholder="Tap to select job"
                onPress={() => setShowJobModal(true)}
                showDropdown={true}
              />
            </View>
          )}

          {currentStep === 'lineItems' && (
            <View style={styles.stepContent}>
              <Text style={styles.sectionTitle}>Line Items</Text>
              <Text style={styles.sectionSubtitle}>
                Add products or services for this invoice
              </Text>

              {formData.lineItems.length > 0 && (
                <View style={styles.itemsList}>
                  {formData.lineItems.map((item) => (
                    <View key={item.id} style={styles.lineItemCard}>
                      <View style={styles.lineItemHeader}>
                        <View style={styles.lineItemInfo}>
                          <Text style={styles.lineItemTitle}>{item.title}</Text>
                          {item.description && (
                            <Text style={styles.lineItemDesc}>{item.description}</Text>
                          )}
                        </View>
                        <TouchableOpacity
                          onPress={() => handleRemoveLineItem(item.id)}
                          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                        >
                          <Trash2 size={18} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                      <View style={styles.lineItemFooter}>
                        <Text style={styles.lineItemAmount}>
                          {formatCurrency(
                            parseFloat(item.quantity) * parseMoney(item.unitPrice)
                          )}
                        </Text>
                        <TouchableOpacity
                          onPress={() => {
                            setEditingLineItemId(item.id);
                            setShowLineItemModal(true);
                          }}
                        >
                          <Text style={styles.editLink}>Edit</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              <TouchableOpacity
                style={styles.addItemButton}
                onPress={() => {
                  setEditingLineItemId(null);
                  setShowLineItemModal(true);
                }}
              >
                <Plus size={18} color="#2563eb" />
                <Text style={styles.addItemText}>Add Item</Text>
              </TouchableOpacity>

              <Text style={styles.sectionTitle} onPress={() => console.log('edit tax')}>
                Totals
              </Text>

              <View style={styles.totalsBox}>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Subtotal</Text>
                  <Text style={styles.totalValue}>{formatCurrency(totals.subtotal)}</Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Tax Rate (%)</Text>
                  <TextInput
                    style={styles.taxInput}
                    value={formData.taxRate}
                    onChangeText={(val) =>
                      setFormData({ ...formData, taxRate: val })
                    }
                    keyboardType="numeric"
                    placeholder="0"
                  />
                </View>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Discount</Text>
                  <TextInput
                    style={styles.taxInput}
                    value={formData.discount}
                    onChangeText={(val) => setFormData({ ...formData, discount: val })}
                    keyboardType="numeric"
                    placeholder="0"
                  />
                </View>
                <View style={[styles.totalRow, styles.totalRowHighlight]}>
                  <Text style={styles.totalLabelBold}>Total Amount</Text>
                  <Text style={styles.totalValueBold}>
                    {formatCurrency(totals.grandTotal)}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {currentStep === 'review' && (
            <View style={styles.stepContent}>
              <Text style={styles.sectionTitle}>Review Invoice</Text>

              <View style={styles.reviewBox}>
                <ReviewRow label="Invoice Number" value={formData.basicInfo.invoiceNum} />
                <ReviewRow label="Customer" value={formData.basicInfo.customer} />
                <ReviewRow label="Issue Date" value={formData.basicInfo.issueDate} />
                <ReviewRow label="Due Date" value={formData.basicInfo.dueDate} />
                {formData.basicInfo.jobReference && (
                  <ReviewRow label="Job Reference" value={formData.basicInfo.jobReference} />
                )}
              </View>

              <Text style={styles.sectionTitle}>Items</Text>
              {formData.lineItems.map((item) => (
                <View key={item.id} style={styles.reviewItem}>
                  <View style={styles.reviewItemHeader}>
                    <Text style={styles.reviewItemTitle}>{item.title}</Text>
                    <Text style={styles.reviewItemAmount}>
                      {formatCurrency(parseFloat(item.quantity) * parseMoney(item.unitPrice))}
                    </Text>
                  </View>
                  {item.description && (
                    <Text style={styles.reviewItemDesc}>{item.description}</Text>
                  )}
                </View>
              ))}

              <View style={styles.reviewBox}>
                <ReviewRow
                  label="Subtotal"
                  value={formatCurrency(totals.subtotal)}
                  bold={false}
                />
                {totals.taxAmount > 0 && (
                  <ReviewRow
                    label={`Tax (${formData.taxRate}%)`}
                    value={formatCurrency(totals.taxAmount)}
                    bold={false}
                  />
                )}
                {totals.discountAmount > 0 && (
                  <ReviewRow
                    label="Discount"
                    value={`-${formatCurrency(totals.discountAmount)}`}
                    bold={false}
                  />
                )}
                <ReviewRow
                  label="Grand Total"
                  value={formatCurrency(totals.grandTotal)}
                  bold={true}
                />
              </View>

              {formData.notes && (
                <>
                  <Text style={styles.sectionTitle}>Notes</Text>
                  <View style={styles.notesBox}>
                    <Text style={styles.notesText}>{formData.notes}</Text>
                  </View>
                </>
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer Buttons */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.btn, styles.btnSecondary]}
          onPress={() => {
            if (currentStep === 'basic') {
              router.back();
            } else if (currentStep === 'lineItems') {
              setCurrentStep('basic');
            } else if (currentStep === 'review') {
              setCurrentStep('lineItems');
            }
          }}
        >
          <Text style={styles.btnSecondaryText}>
            {currentStep === 'basic' ? 'Cancel' : 'Back'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, styles.btnPrimary, !canProceedToNextStep() && styles.btnDisabled]}
          disabled={!canProceedToNextStep()}
          onPress={() => {
            if (currentStep === 'basic') {
              setCurrentStep('lineItems');
            } else if (currentStep === 'lineItems') {
              setCurrentStep('review');
            } else if (currentStep === 'review') {
              handleSubmit();
            }
          }}
        >
          <Text style={styles.btnPrimaryText}>
            {currentStep === 'review' ? 'Create' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Modals */}
      <CustomerPickerModal
        visible={showCustomerModal}
        onSelect={handleCustomerSelect}
        onClose={() => setShowCustomerModal(false)}
      />
      <JobPickerModal
        visible={showJobModal}
        onSelect={handleJobSelect}
        onClose={() => setShowJobModal(false)}
      />
      <LineItemEditorModal
        visible={showLineItemModal}
        item={
          editingLineItemId
            ? formData.lineItems.find((item) => item.id === editingLineItemId)
            : undefined
        }
        onSave={handleAddLineItem}
        onClose={() => {
          setShowLineItemModal(false);
          setEditingLineItemId(null);
        }}
      />
    </SafeAreaView>
  );
};

// --- Helper Components ---
interface ReviewRowProps {
  label: string;
  value: string;
  bold?: boolean;
}

const ReviewRow: React.FC<ReviewRowProps> = ({ label, value, bold = false }) => (
  <View style={styles.reviewRow}>
    <Text style={[styles.reviewRowLabel, bold && styles.reviewRowLabelBold]}>{label}</Text>
    <Text style={[styles.reviewRowValue, bold && styles.reviewRowValueBold]}>{value}</Text>
  </View>
);

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: '#f8fafc',
  },
  stepContainer: {
    alignItems: 'center',
    flex: 1,
  },
  stepCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  stepCircleActive: {
    backgroundColor: '#2563eb',
  },
  stepCircleCompleted: {
    backgroundColor: '#10b981',
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
  },
  stepNumberActive: {
    color: '#ffffff',
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
    textAlign: 'center',
  },
  stepLine: {
    position: 'absolute',
    height: 2,
    backgroundColor: '#e2e8f0',
    top: 18,
    left: '50%',
    right: '-50%',
    width: '100%',
  },
  stepLineCompleted: {
    backgroundColor: '#10b981',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100,
  },
  stepContent: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 8,
    marginBottom: 0,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 12,
  },
  inputWrapper: {
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
    textTransform: 'uppercase',
  },
  required: {
    color: '#ef4444',
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
  },
  inputField: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  inputFieldError: {
    borderColor: '#ef4444',
  },
  inputFieldDisabled: {
    backgroundColor: '#f1f5f9',
    opacity: 0.6,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  fiftyCol: {
    flex: 1,
  },
  modal: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  modalItemContent: {
    flex: 1,
  },
  modalItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  modalItemSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  taxableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  taxableLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  saveButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#2563eb',
    marginTop: 16,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
  },
  itemsList: {
    gap: 8,
    marginBottom: 12,
  },
  lineItemCard: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  lineItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  lineItemInfo: {
    flex: 1,
  },
  lineItemTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  lineItemDesc: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  lineItemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lineItemAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  editLink: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563eb',
  },
  addItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#2563eb',
    borderStyle: 'dashed',
    gap: 8,
    marginBottom: 16,
  },
  addItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
  },
  totalsBox: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 10,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalRowHighlight: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748b',
  },
  totalLabelBold: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  totalValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  totalValueBold: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  taxInput: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    minWidth: 60,
    textAlign: 'right',
  },
  reviewBox: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 10,
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewRowLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748b',
  },
  reviewRowLabelBold: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  reviewRowValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  reviewRowValueBold: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  reviewItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 8,
  },
  reviewItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  reviewItemTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  reviewItemAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  reviewItemDesc: {
    fontSize: 12,
    color: '#94a3b8',
  },
  notesBox: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  notesText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#64748b',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnPrimary: {
    backgroundColor: '#2563eb',
  },
  btnPrimaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  btnSecondary: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  btnSecondaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  btnDisabled: {
    opacity: 0.5,
  },
});

export default InvoiceCreateWizardScreen;
