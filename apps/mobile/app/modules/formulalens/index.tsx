/**
 * FormulaLens — Product & Ingredient Intelligence
 *
 * Zero-fabrication: no fake ingredient facts, no fabricated product matches.
 * Evidence is returned from the API only; if unavailable, shows evidence_unavailable.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '../../../src/lib/supabase';
import { Colors, Spacing, Typography, BorderRadius } from '../../../src/components/ui/theme';
import { Button, Card } from '../../../src/components/ui';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

type ProductStatus = 'active' | 'paused' | 'discontinued';

interface Product {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  status: ProductStatus;
  ingredients: string[];
  notes: string | null;
  createdAt: string;
}

type ScreenState = 'loading' | 'ready' | 'auth_required' | 'not_configured' | 'database_unavailable';

const PRODUCT_CATEGORIES = [
  'cleanser', 'toner', 'serum', 'moisturizer', 'sunscreen',
  'treatment', 'spot_treatment', 'mask', 'exfoliant', 'other',
];

function getAccessToken(): Promise<string | null> {
  return supabase.auth.getSession().then(({ data }) => data.session?.access_token ?? null);
}

export default function FormulaLensScreen() {
  const [screenState, setScreenState] = useState<ScreenState>('loading');
  const [products, setProducts] = useState<Product[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  // Add product form
  const [productName, setProductName] = useState('');
  const [productBrand, setProductBrand] = useState('');
  const [productCategory, setProductCategory] = useState('');
  const [productIngredients, setProductIngredients] = useState('');
  const [productNotes, setProductNotes] = useState('');

  const loadProducts = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) { setScreenState('auth_required'); return; }
    if (!API_BASE) {
      // FormulaLens can show empty state without API — product list is local
      setScreenState('ready');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/products`, {
        headers: { authorization: `Bearer ${token}` },
      });
      if (res.status === 503) { setScreenState('database_unavailable'); return; }
      if (!res.ok) { setScreenState('ready'); return; } // Graceful — show empty
      const payload = await res.json() as { products?: Product[] };
      setProducts(payload.products ?? []);
      setScreenState('ready');
    } catch {
      setScreenState('ready'); // Show empty rather than blocking
    }
  }, []);

  useEffect(() => { void loadProducts(); }, [loadProducts]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadProducts();
    setRefreshing(false);
  }, [loadProducts]);

  const saveProduct = useCallback(async () => {
    const name = productName.trim();
    if (!name) { Alert.alert('Name Required', 'Please enter a product name.'); return; }
    const token = await getAccessToken();
    if (!token) { Alert.alert('Auth Required', 'Please sign in.'); return; }
    if (!API_BASE) {
      Alert.alert('Not Configured', 'Product API is not configured. Products cannot be saved yet.');
      return;
    }
    setSaving(true);
    try {
      const ingredients = productIngredients
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
      const res = await fetch(`${API_BASE}/api/products`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          name,
          brand: productBrand.trim() || null,
          category: productCategory || null,
          ingredients,
          notes: productNotes.trim() || null,
          status: 'active',
        }),
      });
      if (!res.ok) {
        Alert.alert('Error', 'Could not save product. Please try again.');
        return;
      }
      const payload = await res.json() as { product?: Product };
      if (payload.product) {
        setProducts(prev => [payload.product!, ...prev]);
      }
      setShowAdd(false);
      setProductName('');
      setProductBrand('');
      setProductCategory('');
      setProductIngredients('');
      setProductNotes('');
    } catch {
      Alert.alert('Error', 'Could not save product.');
    } finally {
      setSaving(false);
    }
  }, [productName, productBrand, productCategory, productIngredients, productNotes]);

  const filteredProducts = products.filter(p =>
    !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.brand ?? '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (screenState === 'loading') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.primary} size="large" />
          <Text style={styles.loadingText}>Loading FormulaLens…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (showAdd) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setShowAdd(false)} style={styles.backBtn}>
            <Text style={styles.backText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Add Product</Text>
          <View style={{ width: 60 }} />
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.fieldLabel}>Product Name *</Text>
          <TextInput
            style={styles.textInput}
            value={productName}
            onChangeText={setProductName}
            placeholder="e.g. CeraVe Foaming Cleanser"
            placeholderTextColor={Colors.textMuted}
            maxLength={200}
            accessibilityLabel="Product name"
          />
          <Text style={styles.fieldLabel}>Brand</Text>
          <TextInput
            style={styles.textInput}
            value={productBrand}
            onChangeText={setProductBrand}
            placeholder="e.g. CeraVe"
            placeholderTextColor={Colors.textMuted}
            maxLength={100}
            accessibilityLabel="Brand"
          />
          <Text style={styles.fieldLabel}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
            {PRODUCT_CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat}
                onPress={() => setProductCategory(cat === productCategory ? '' : cat)}
                style={[styles.chip, productCategory === cat && styles.chipSelected]}
                accessibilityLabel={cat}
                accessibilityState={{ selected: productCategory === cat }}
              >
                <Text style={[styles.chipText, productCategory === cat && styles.chipTextSelected]}>
                  {cat.replace(/_/g, ' ')}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <Text style={styles.fieldLabel}>Ingredients (comma-separated)</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            value={productIngredients}
            onChangeText={setProductIngredients}
            placeholder="e.g. niacinamide, ceramides, hyaluronic acid"
            placeholderTextColor={Colors.textMuted}
            multiline
            numberOfLines={3}
            maxLength={2000}
            accessibilityLabel="Ingredients"
          />
          <Text style={styles.fieldLabel}>Notes</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            value={productNotes}
            onChangeText={setProductNotes}
            placeholder="Any notes about this product…"
            placeholderTextColor={Colors.textMuted}
            multiline
            numberOfLines={3}
            maxLength={1000}
            accessibilityLabel="Notes"
          />
          <Card style={styles.evidenceNotice}>
            <Text style={styles.evidenceText}>
              🔬 Ingredient analysis requires evidence corpus configuration.
              Product data is saved now; analysis will be available after Codex ML setup.
            </Text>
          </Card>
          <Button
            title={saving ? 'Saving…' : 'Save Product'}
            onPress={saveProduct}
            loading={saving}
            disabled={saving}
            style={styles.saveBtn}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>FormulaLens</Text>
        <TouchableOpacity onPress={() => setShowAdd(true)} style={styles.newBtn} accessibilityLabel="Add product">
          <Text style={styles.newBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Card style={styles.aboutCard}>
          <Text style={styles.aboutTitle}>🔬 FormulaLens — Product Intelligence</Text>
          <Text style={styles.aboutText}>
            Track your skincare products and ingredients. FormulaLens connects products to your
            treatment plan, routine logs, and TriggerGraph to identify potential correlations.
            Evidence-backed ingredient analysis requires Codex configuration.
          </Text>
        </Card>

        {/* Search */}
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search products…"
          placeholderTextColor={Colors.textMuted}
          accessibilityLabel="Search products"
          clearButtonMode="while-editing"
        />

        {/* Products list */}
        <Text style={styles.sectionTitle}>
          {filteredProducts.length > 0 ? `Products (${filteredProducts.length})` : 'Products'}
        </Text>
        {filteredProducts.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🧴</Text>
            <Text style={styles.emptyTitle}>
              {searchQuery ? 'No products match your search' : 'No products yet'}
            </Text>
            <Text style={styles.emptyText}>
              {searchQuery
                ? 'Try a different search term.'
                : 'Add your skincare products to track ingredients and connect them to your skin patterns.'}
            </Text>
            {!searchQuery && (
              <Button title="Add Product" onPress={() => setShowAdd(true)} style={styles.startBtn} />
            )}
          </Card>
        ) : (
          filteredProducts.map(product => (
            <Card key={product.id} style={styles.productCard}>
              <View style={styles.productHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.productName}>{product.name}</Text>
                  {product.brand && <Text style={styles.productBrand}>{product.brand}</Text>}
                </View>
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryText}>
                    {(product.category ?? 'other').replace(/_/g, ' ')}
                  </Text>
                </View>
              </View>
              {product.ingredients.length > 0 && (
                <View style={styles.ingredientsSection}>
                  <Text style={styles.ingredientsLabel}>Ingredients ({product.ingredients.length})</Text>
                  <Text style={styles.ingredientsList} numberOfLines={2}>
                    {product.ingredients.join(', ')}
                  </Text>
                </View>
              )}
              {product.notes && (
                <Text style={styles.productNotes} numberOfLines={2}>{product.notes}</Text>
              )}
              <View style={styles.productFooter}>
                <View style={[styles.statusDot, {
                  backgroundColor: product.status === 'active' ? Colors.success : Colors.textMuted
                }]} />
                <Text style={styles.productStatus}>{product.status}</Text>
                <Text style={styles.productDate}>
                  Added {new Date(product.createdAt).toLocaleDateString()}
                </Text>
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { paddingRight: Spacing.sm },
  backText: { ...Typography.bodyMedium, color: Colors.primary },
  title: { ...Typography.title3, color: Colors.textPrimary, flex: 1, textAlign: 'center' },
  newBtn: { paddingLeft: Spacing.sm },
  newBtnText: { ...Typography.bodyMedium, color: Colors.primary },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  loadingText: { ...Typography.body, color: Colors.textSecondary, marginTop: Spacing.md },
  aboutCard: { marginBottom: Spacing.lg },
  aboutTitle: { ...Typography.bodyMedium, color: Colors.textPrimary, marginBottom: 6 },
  aboutText: { ...Typography.caption, color: Colors.textSecondary, lineHeight: 18 },
  searchInput: {
    ...Typography.body, color: Colors.textPrimary,
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    marginBottom: Spacing.md, minHeight: 44,
  },
  sectionTitle: { ...Typography.title3, color: Colors.textPrimary, marginBottom: Spacing.md },
  emptyCard: { alignItems: 'center', padding: Spacing.xl },
  emptyIcon: { fontSize: 40, marginBottom: Spacing.md },
  emptyTitle: { ...Typography.bodyMedium, color: Colors.textPrimary, marginBottom: 6 },
  emptyText: { ...Typography.caption, color: Colors.textSecondary, textAlign: 'center', lineHeight: 18, marginBottom: Spacing.lg },
  startBtn: { minWidth: 180 },
  productCard: { marginBottom: Spacing.md },
  productHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: Spacing.sm },
  productName: { ...Typography.bodyMedium, color: Colors.textPrimary },
  productBrand: { ...Typography.caption, color: Colors.textMuted, marginTop: 2 },
  categoryBadge: {
    backgroundColor: Colors.primaryLight, borderRadius: BorderRadius.sm,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  categoryText: { ...Typography.caption, color: Colors.primaryDark, textTransform: 'capitalize' },
  ingredientsSection: { marginBottom: Spacing.sm },
  ingredientsLabel: { ...Typography.caption, color: Colors.textMuted, marginBottom: 2 },
  ingredientsList: { ...Typography.caption, color: Colors.textSecondary, lineHeight: 18 },
  productNotes: { ...Typography.caption, color: Colors.textSecondary, lineHeight: 18, marginBottom: Spacing.sm },
  productFooter: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  productStatus: { ...Typography.caption, color: Colors.textMuted, textTransform: 'capitalize' },
  productDate: { ...Typography.caption, color: Colors.textMuted, marginLeft: 'auto' },
  fieldLabel: { ...Typography.bodyMedium, color: Colors.textPrimary, marginBottom: Spacing.sm, marginTop: Spacing.md },
  textInput: {
    ...Typography.body, color: Colors.textPrimary,
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, minHeight: 44,
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  chipRow: { marginBottom: Spacing.sm },
  chip: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.surface, marginRight: Spacing.sm,
  },
  chipSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { ...Typography.caption, color: Colors.textSecondary, textTransform: 'capitalize' },
  chipTextSelected: { color: '#fff', fontWeight: '600' },
  evidenceNotice: { marginTop: Spacing.lg, backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
  evidenceText: { ...Typography.caption, color: '#1d4ed8', lineHeight: 18 },
  saveBtn: { marginTop: Spacing.xl },
});
