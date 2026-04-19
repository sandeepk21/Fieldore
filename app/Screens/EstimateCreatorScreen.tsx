import {
    ChevronLeft,
    DollarSign,
    FileText,
    Hash,
    MoreVertical,
    Percent,
    Plus,
    Send,
    Tag,
    Trash2,
    User,
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// --- Interfaces ---
interface EstimateItem {
  id: string;
  service: string;
  description: string;
  qty: number;
  price: number;
}

const EstimateCreatorScreen: React.FC = () => {
  const [items, setItems] = useState<EstimateItem[]>([
    { id: '1', service: 'Full Rewire', description: 'Complete basement rewiring', qty: 1, price: 1200 }
  ]);
  const [tax, setTax] = useState<string>('10');
  const [discount, setDiscount] = useState<string>('0');

  // --- Logic ---
  const addItem = () => {
    const newItem: EstimateItem = { 
      id: Date.now().toString(), 
      service: '', 
      description: '', 
      qty: 1, 
      price: 0 
    };
    setItems([...items, newItem]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: keyof EstimateItem, value: string | number) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const subtotal = items.reduce((acc, item) => acc + (item.qty * item.price), 0);
  const taxAmount = (subtotal * parseFloat(tax || '0')) / 100;
  const total = subtotal + taxAmount - parseFloat(discount || '0');

  return (
    <SafeAreaView style={styles.container}>
      
      
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn}>
          <ChevronLeft size={20} color="#64748b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>NEW ESTIMATE</Text>
        <TouchableOpacity style={styles.iconBtn}>
          <MoreVertical size={20} color="#64748b" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView 
          showsVerticalScrollIndicator={false} 
          contentContainerStyle={styles.scrollContent}
        >
          {/* Customer Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>CUSTOMER</Text>
            <TouchableOpacity style={styles.customerCard} activeOpacity={0.7}>
              <View style={styles.customerAvatar}>
                <User size={20} color="white" fill="white" />
              </View>
              <View style={styles.customerInfo}>
                <Text style={styles.customerTitle}>Select Customer</Text>
                <Text style={styles.customerSub}>Tap to link a client...</Text>
              </View>
              <Plus size={18} color="#cbd5e1" />
            </TouchableOpacity>
          </View>

          {/* Items Header */}
          <View style={styles.itemsHeader}>
            <Text style={styles.itemsTitle}>Estimate Items</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {items.length} {items.length === 1 ? 'ITEM' : 'ITEMS'}
              </Text>
            </View>
          </View>

          {/* Items List */}
          {items.map((item) => (
            <View key={item.id} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <View style={styles.itemInputs}>
                  <View style={styles.inlineInput}>
                    <Tag size={16} color="#cbd5e1" style={styles.inputIcon} />
                    <TextInput
                      style={styles.serviceInput}
                      placeholder="Service name..."
                      value={item.service}
                      onChangeText={(val) => updateItem(item.id, 'service', val)}
                    />
                  </View>
                  <View style={styles.inlineInput}>
                    <FileText size={16} color="#cbd5e1" style={[styles.inputIcon, { marginTop: 4 }]} />
                    <TextInput
                      style={styles.descriptionInput}
                      placeholder="Detailed description..."
                      multiline
                      value={item.description}
                      onChangeText={(val) => updateItem(item.id, 'description', val)}
                    />
                  </View>
                </View>
                <TouchableOpacity onPress={() => removeItem(item.id)} style={styles.deleteBtn}>
                  <Trash2 size={18} color="#cbd5e1" />
                </TouchableOpacity>
              </View>

              {/* Price & Qty Grid */}
              <View style={styles.itemGrid}>
                <View style={styles.gridInput}>
                  <Hash size={14} color="#cbd5e1" />
                  <View>
                    <Text style={styles.gridLabel}>QTY</Text>
                    <TextInput
                      style={styles.gridText}
                      keyboardType="numeric"
                      value={item.qty.toString()}
                      onChangeText={(val) => updateItem(item.id, 'qty', parseInt(val) || 0)}
                    />
                  </View>
                </View>
                <View style={styles.gridInput}>
                  <DollarSign size={14} color="#cbd5e1" />
                  <View>
                    <Text style={styles.gridLabel}>UNIT PRICE</Text>
                    <TextInput
                      style={styles.gridText}
                      keyboardType="numeric"
                      value={item.price.toString()}
                      onChangeText={(val) => updateItem(item.id, 'price', parseInt(val) || 0)}
                    />
                  </View>
                </View>
              </View>
            </View>
          ))}

          {/* Add Item Button */}
          <TouchableOpacity style={styles.addItemBtn} onPress={addItem}>
            <Plus size={18} color="#94a3b8" />
            <Text style={styles.addItemText}>Add Another Item</Text>
          </TouchableOpacity>

          {/* Tax & Discount Row */}
          <View style={styles.row}>
            <View style={styles.miniCard}>
              <View style={styles.miniHeader}>
                <View style={styles.miniIcon}><Percent size={12} color="#94a3b8" /></View>
                <Text style={styles.miniLabel}>TAX RATE</Text>
              </View>
              <TextInput
                style={[styles.miniValue, { color: '#2563eb' }]}
                keyboardType="numeric"
                value={tax}
                onChangeText={setTax}
              />
            </View>
            <View style={styles.miniCard}>
              <View style={styles.miniHeader}>
                <View style={styles.miniIcon}><DollarSign size={12} color="#94a3b8" /></View>
                <Text style={styles.miniLabel}>DISCOUNT</Text>
              </View>
              <TextInput
                style={[styles.miniValue, { color: '#d97706' }]}
                keyboardType="numeric"
                value={discount}
                onChangeText={setDiscount}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Floating Footer Summary */}
      <View style={styles.footer}>
        <View style={styles.summaryBreakdown}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>SUBTOTAL</Text>
            <Text style={styles.summaryValue}>${subtotal.toLocaleString()}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>TAX ({tax}%)</Text>
            <Text style={styles.summaryValue}>+${taxAmount.toLocaleString()}</Text>
          </View>
          {parseFloat(discount) > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: '#d97706' }]}>DISCOUNT</Text>
              <Text style={[styles.summaryValue, { color: '#d97706' }]}>-${parseFloat(discount).toLocaleString()}</Text>
            </View>
          )}
          <View style={styles.divider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Estimate</Text>
            <Text style={styles.totalValue}>${total.toLocaleString()}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.sendBtn} activeOpacity={0.9}>
          <Text style={styles.sendBtnText}>Send Estimate</Text>
          <Send size={20} color="white" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 60,
  },
  iconBtn: {
    width: 40,
    height: 40,
    backgroundColor: 'white',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  headerTitle: { fontSize: 12, fontWeight: '900', color: '#94a3b8', letterSpacing: 2 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 300 },
  section: { marginBottom: 32 },
  sectionLabel: { fontSize: 11, fontWeight: '900', color: '#cbd5e1', letterSpacing: 1.5, marginBottom: 12, marginLeft: 4 },
  customerCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    alignItems: 'center',
    gap: 16,
  },
  customerAvatar: { width: 48, height: 48, backgroundColor: '#2563eb', borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  customerInfo: { flex: 1 },
  customerTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  customerSub: { fontSize: 12, color: '#94a3b8', fontWeight: '500', marginTop: 2 },
  itemsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  itemsTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  badge: { backgroundColor: '#eff6ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 10, fontWeight: '900', color: '#2563eb' },
  itemCard: {
    backgroundColor: 'white',
    borderRadius: 32,
    padding: 20,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 16,
  },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  itemInputs: { flex: 1 },
  inlineInput: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  inputIcon: { marginRight: 8 },
  serviceInput: { flex: 1, fontSize: 14, fontWeight: '700', color: '#0f172a', borderBottomWidth: 1, borderBottomColor: '#f8fafc', paddingBottom: 4 },
  descriptionInput: { flex: 1, fontSize: 13, fontWeight: '500', color: '#64748b', textAlignVertical: 'top' },
  deleteBtn: { padding: 4 },
  itemGrid: { flexDirection: 'row', gap: 12, borderTopWidth: 1, borderTopColor: '#f8fafc', paddingTop: 16 },
  gridInput: { flex: 1, backgroundColor: '#f8fafc', borderRadius: 16, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  gridLabel: { fontSize: 9, fontWeight: '900', color: '#94a3b8' },
  gridText: { fontSize: 14, fontWeight: '900', color: '#0f172a' },
  addItemBtn: {
    height: 64,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 32,
  },
  addItemText: { fontSize: 14, fontWeight: '700', color: '#94a3b8' },
  row: { flexDirection: 'row', gap: 16 },
  miniCard: { flex: 1, backgroundColor: 'white', borderRadius: 24, padding: 16, borderWidth: 1, borderColor: '#f1f5f9' },
  miniHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  miniIcon: { width: 24, height: 24, backgroundColor: '#f8fafc', borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  miniLabel: { fontSize: 10, fontWeight: '900', color: '#0f172a' },
  miniValue: { fontSize: 18, fontWeight: '900' },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  summaryBreakdown: { marginBottom: 24, paddingHorizontal: 8 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryLabel: { fontSize: 11, fontWeight: '800', color: '#94a3b8', letterSpacing: 0.5 },
  summaryValue: { fontSize: 11, fontWeight: '900', color: '#0f172a' },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 8 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 16, fontWeight: '900', color: '#0f172a' },
  totalValue: { fontSize: 24, fontWeight: '900', color: '#2563eb' },
  sendBtn: {
    height: 68,
    backgroundColor: '#2563eb',
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: '#2563eb',
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  sendBtnText: { fontSize: 18, fontWeight: '900', color: 'white' }
});

export default EstimateCreatorScreen;