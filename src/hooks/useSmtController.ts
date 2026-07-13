import { useEffect, useMemo, useRef, useState } from 'react';
import {
  buildCartItem,
  cartPendingIssues,
  cartTotal,
  normalizeCatalog,
  requiresConfiguration,
  toApiItem,
  updateCartItem as applyCartUpdate,
} from '../domain/businessRules';
import { demoNetworkOrders, demoProducts, demoTables } from '../domain/demoData';
import type {
  CartItem,
  CartSelections,
  DeviceIdentity,
  FirebaseUserIdentity,
  HoldOrder,
  NetworkOrder,
  OrderMode,
  OrderSource,
  PaymentMethod,
  Product,
  RuntimeHealth,
  StaffProfile,
  TableSession,
  ToastMessage,
  ViewKey,
} from '../domain/types';
import { getRuntimeConfig, setRuntimeMode as persistRuntimeMode, validateRuntimeConfig } from '../runtime/config';
import { getDeviceIdentity, setDeviceNumber as persistDeviceNumber } from '../runtime/deviceIdentity';
import { createFirebaseGateway, type FirebaseGateway } from '../services/firebaseGateway';
import { createOrderApiClient, type OrderApiClient, type StaffOrderDraftPayload } from '../services/orderApi';

const HOLD_KEY = 'morefun.smt.holds.v1';
const TABLE_KEY = 'morefun.smt.tables.v1';

export function useSmtController() {
  const config = useMemo(() => getRuntimeConfig(), []);
  const configErrors = useMemo(() => validateRuntimeConfig(config), [config]);
  const gatewayRef = useRef<FirebaseGateway | null>(null);
  const apiRef = useRef<OrderApiClient | null>(null);
  const [device, setDevice] = useState<DeviceIdentity>(() => getDeviceIdentity());
  const [user, setUser] = useState<FirebaseUserIdentity | null>(null);
  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [view, setView] = useState<ViewKey>('order');
  const [products, setProducts] = useState<Record<string, Product>>(() => config.mode === 'demo' ? demoProducts : {});
  const [cart, setCart] = useState<CartItem[]>([]);
  const [source, setSource] = useState<OrderSource>('walk_in');
  const [orderMode, setOrderMode] = useState<OrderMode>('takeaway');
  const [tableId, setTableId] = useState<string>();
  const [orderNote, setOrderNote] = useState('');
  const [holds, setHolds] = useState<HoldOrder[]>(() => loadLocal(HOLD_KEY, []));
  const [tables, setTables] = useState<TableSession[]>(() => loadLocal(TABLE_KEY, demoTables));
  const [networkOrders, setNetworkOrders] = useState<NetworkOrder[]>(() => config.mode === 'demo' ? demoNetworkOrders : []);
  const [printJobs, setPrintJobs] = useState<Record<string, unknown>>({});
  const [health, setHealth] = useState<RuntimeHealth>({
    firebase: config.mode === 'demo' ? 'online' : 'idle',
    api: config.mode === 'demo' ? 'ready' : 'idle',
    auth: config.mode === 'demo' ? 'signed_in' : 'signed_out',
    realtime: config.mode === 'demo' ? 'online' : 'idle',
    lastMessage: config.mode === 'demo' ? '本機試運行：所有操作不會寫入雲端' : '準備連線',
  });
  const [toast, setToast] = useState<ToastMessage>();
  const [busyKey, setBusyKey] = useState('');
  const [catalogMeta, setCatalogMeta] = useState<Record<string, unknown>>({});
  const pendingRaw = useRef<Record<string, unknown>>({});
  const activeRaw = useRef<Record<string, unknown>>({});
  const ordersRaw = useRef<Record<string, unknown>>({});

  const categories = useMemo(() => [...new Set(Object.values(products).map((product) => product.category))], [products]);
  const pendingIssues = useMemo(() => cartPendingIssues(cart), [cart]);
  const total = useMemo(() => cartTotal(cart), [cart]);
  const cartQty = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);
  const occupiedTables = useMemo(() => tables.filter((table) => table.status === 'occupied').length, [tables]);
  const soldOutCount = useMemo(() => Object.values(products).filter((product) => product.availability !== 'available').length, [products]);
  const newNetworkCount = useMemo(() => networkOrders.filter((order) => order.status === 'pending').length, [networkOrders]);
  const abnormalCount = useMemo(() => networkOrders.filter((order) => order.status === 'abnormal').length, [networkOrders]);

  useEffect(() => { saveLocal(HOLD_KEY, holds); }, [holds]);
  useEffect(() => { saveLocal(TABLE_KEY, tables); }, [tables]);
  useEffect(() => {
    const online = () => setHealth((current) => ({ ...current, firebase: current.firebase === 'error' ? 'error' : 'connecting', lastMessage: '網絡已恢復，重新連線中' }));
    const offline = () => setHealth((current) => ({ ...current, firebase: 'offline', api: 'offline', realtime: 'offline', lastMessage: '裝置離線，正式操作已暫停' }));
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    return () => { window.removeEventListener('online', online); window.removeEventListener('offline', offline); };
  }, []);

  useEffect(() => {
    if (config.mode === 'demo') return;
    if (configErrors.length) {
      setHealth({ firebase: 'error', api: 'error', auth: 'signed_out', realtime: 'error', lastMessage: `缺少設定：${configErrors.join(', ')}` });
      return;
    }
    let stopUser = () => {};
    let stopConnected = () => {};
    try {
      const gateway = createFirebaseGateway(config);
      gatewayRef.current = gateway;
      apiRef.current = createOrderApiClient({ baseUrl: config.orderApiBaseUrl, getToken: gateway.getIdToken, getDevice: () => getDeviceIdentity() });
      setHealth((current) => ({ ...current, firebase: 'connecting', api: 'checking', lastMessage: '連接 Firebase／Worker 中' }));
      stopConnected = gateway.subscribeConnected((connected) => setHealth((current) => ({ ...current, firebase: connected ? 'online' : 'offline', realtime: connected ? current.realtime : 'offline', lastMessage: connected ? 'Firebase 已連線' : 'Firebase 已離線' })));
      stopUser = gateway.onUser(setUser);
      void apiRef.current.health().then((result) => {
        const enabled = Boolean(result.order_api_enabled ?? result.enabled ?? result.ORDER_API_ENABLED);
        setHealth((current) => ({ ...current, api: enabled ? 'ready' : 'disabled', lastMessage: enabled ? 'Worker staging 可寫入' : 'Worker 已連線，但訂單寫入仍關閉' }));
      }).catch((error: Error) => setHealth((current) => ({ ...current, api: navigator.onLine ? 'error' : 'offline', lastMessage: error.message })));
    } catch (error) {
      setHealth({ firebase: 'error', api: 'error', auth: 'signed_out', realtime: 'error', lastMessage: String((error as Error).message || error) });
    }
    return () => { stopUser(); stopConnected(); gatewayRef.current = null; apiRef.current = null; };
  }, [config, configErrors]);

  useEffect(() => {
    if (config.mode === 'demo') return;
    const gateway = gatewayRef.current;
    if (!gateway || !user) {
      setProfile(null);
      setHealth((current) => ({ ...current, auth: 'signed_out', realtime: 'idle' }));
      return;
    }
    const unsubs: Array<() => void> = [];
    setHealth((current) => ({ ...current, auth: 'signed_in', realtime: 'connecting', lastMessage: '驗證 SMT 權限中' }));
    unsubs.push(gateway.subscribeStaffProfile(user.uid, (nextProfile) => {
      setProfile(nextProfile);
      const allowed = Boolean(nextProfile?.active && (nextProfile.role === 'smt' || nextProfile.role === 'admin'));
      setHealth((current) => ({ ...current, auth: allowed ? 'signed_in' : 'forbidden', lastMessage: allowed ? `已登入：${nextProfile?.displayName}` : '此帳戶沒有有效 SMT 權限' }));
    }));
    unsubs.push(gateway.subscribeCatalog((raw) => {
      const normalized = normalizeCatalog(raw);
      setProducts(normalized.products);
      setCatalogMeta(normalized.manifest || {});
      setHealth((current) => ({ ...current, realtime: 'online', lastMessage: `Firebase Catalog 已載入 ${Object.keys(normalized.products).length} 款商品` }));
    }, (error) => setHealth((current) => ({ ...current, realtime: 'error', lastMessage: error.message }))));
    unsubs.push(gateway.subscribePath('dispatchV1/smt/pending', (value) => { pendingRaw.current = asRecord(value); refreshNetworkOrders(); }));
    unsubs.push(gateway.subscribePath('dispatchV1/smt/active', (value) => { activeRaw.current = asRecord(value); refreshNetworkOrders(); }));
    unsubs.push(gateway.subscribePath('ordersV1', (value) => { ordersRaw.current = asRecord(value); refreshNetworkOrders(); }));
    unsubs.push(gateway.subscribePath('printJobsV1', (value) => setPrintJobs(asRecord(value))));
    return () => unsubs.forEach((unsubscribe) => unsubscribe());
  }, [user, config.mode]);

  useEffect(() => {
    if (config.mode === 'demo' || !profile?.active || !['smt', 'admin'].includes(profile.role) || !device.deviceNumber || !apiRef.current) return;
    let cancelled = false;
    const register = async () => {
      try {
        await apiRef.current?.registerDevice({ platform: 'web-pwa', app_version: config.appVersion });
        if (!cancelled) setToast({ kind: 'success', message: `${device.deviceNumber} 已完成裝置登記` });
      } catch (error) {
        if (!cancelled) setToast({ kind: 'error', message: (error as Error).message });
      }
    };
    void register();
    const timer = window.setInterval(() => void apiRef.current?.heartbeat({ app_version: config.appVersion }).catch(() => undefined), 60_000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [profile, device.deviceNumber, config.mode, config.appVersion]);

  function refreshNetworkOrders() {
    const ids = new Set([...Object.keys(pendingRaw.current), ...Object.keys(activeRaw.current)]);
    const normalized = [...ids].map((id) => normalizeNetworkOrder(id, ordersRaw.current[id], pendingRaw.current[id] ?? activeRaw.current[id]));
    normalized.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    setNetworkOrders(normalized);
  }

  async function login(email: string, password: string, deviceNumber: string) {
    if (config.mode === 'demo') return;
    const gateway = gatewayRef.current;
    if (!gateway) throw new Error('Firebase 尚未準備好');
    setBusyKey('login');
    try {
      setDevice(persistDeviceNumber(deviceNumber));
      await gateway.signIn(email, password);
    } finally { setBusyKey(''); }
  }

  async function logout() {
    await gatewayRef.current?.signOut();
    setUser(null);
    setProfile(null);
  }

  function quickAdd(product: Product) {
    if (product.availability !== 'available') { setToast({ kind: 'warning', message: `${product.name} 已售罄` }); return; }
    if (requiresConfiguration(product)) return false;
    addConfigured(product, buildCartItem(product, products).selections, '');
    return true;
  }

  function addConfigured(product: Product, selections: CartSelections, note: string, existingId?: string) {
    if (existingId) {
      setCart((current) => current.map((item) => item.id === existingId ? applyCartUpdate(item, product, products, selections, note) : item));
      setToast({ kind: 'success', message: `${product.name} 已更新` });
      return;
    }
    const item = buildCartItem(product, products, selections, note);
    setCart((current) => [...current, item]);
    setToast({ kind: item.pendingIssues.length ? 'warning' : 'success', message: item.pendingIssues.length ? `${product.name} 已加入，尚有 ${item.pendingIssues.length} 項待補` : `${product.name} 已加入購物車` });
  }

  function updateQuantity(itemId: string, quantity: number) {
    if (quantity <= 0) { setCart((current) => current.filter((item) => item.id !== itemId)); return; }
    setCart((current) => current.map((item) => item.id === itemId ? { ...item, quantity: Math.min(20, quantity) } : item));
  }

  function clearCart() { setCart([]); setOrderNote(''); }

  function holdCurrent() {
    if (!cart.length) return;
    const now = new Date().toISOString();
    const draft = makeDraft();
    setHolds((current) => [{ id: `hold-${crypto.randomUUID()}`, title: `暫存 ${current.length + 1}`, draft, createdAt: now }, ...current]);
    clearCart();
    setToast({ kind: 'success', message: '訂單已暫存於本機；恢復時會重新檢查售罄及價格' });
  }

  function restoreHold(hold: HoldOrder) {
    const refreshed = hold.draft.items.map((item) => {
      const product = products[item.productId];
      return product ? applyCartUpdate(item, product, products, item.selections, item.note) : { ...item, pendingIssues: [{ kind: 'invalid_product' as const, message: '商品已不存在' }] };
    });
    setCart(refreshed);
    setSource(hold.draft.source);
    setOrderMode(hold.draft.mode);
    setTableId(hold.draft.tableId);
    setOrderNote(hold.draft.note);
    setHolds((current) => current.filter((item) => item.id !== hold.id));
    setView('order');
  }

  async function submitOrder(paymentMethod: PaymentMethod, customerName = '', customerPhone = '', requestedTime = 'asap') {
    if (!cart.length) throw new Error('購物車未有商品');
    if (pendingIssues.length) throw new Error(`尚有 ${pendingIssues.length} 項待補，未能送單`);
    const payload = makePayload(paymentMethod, customerName, customerPhone, requestedTime);
    setBusyKey('submit-order');
    try {
      if (config.mode === 'demo') {
        const id = `demo-order-${Date.now()}`;
        const order: NetworkOrder = { id, orderNo: `#D-${String(Date.now()).slice(-5)}`, source, status: 'accepted', total, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), itemCount: cartQty, issueCount: 0, raw: { demo: true, payload } };
        setNetworkOrders((current) => [order, ...current]);
        attachOrderToTable(order);
        clearCart();
        setToast({ kind: 'warning', message: '本機試運行訂單已建立，未寫入 Firebase' });
        return order;
      }
      if (!apiRef.current) throw new Error('Order API 尚未準備好');
      const result = await apiRef.current.createStaffOrder(payload, crypto.randomUUID());
      const rawOrder = asRecord(result.order ?? result);
      const order = normalizeNetworkOrder(String(rawOrder.order_id || `order-${Date.now()}`), rawOrder, rawOrder);
      attachOrderToTable(order);
      clearCart();
      setToast({ kind: 'success', message: `正式訂單 ${order.orderNo} 已建立並同步到 SMT` });
      return order;
    } finally { setBusyKey(''); }
  }

  async function acceptOrder(order: NetworkOrder) {
    setBusyKey(`accept:${order.id}`);
    try {
      if (config.mode === 'demo') setNetworkOrders((current) => current.map((item) => item.id === order.id ? { ...item, status: 'accepted', updatedAt: new Date().toISOString() } : item));
      else await requireApi().acceptOrder(order.id);
      setToast({ kind: 'success', message: `${order.orderNo} 已接單，打印工作由 SMT 後端建立` });
    } finally { setBusyKey(''); }
  }

  async function advanceOrder(order: NetworkOrder) {
    const next = order.status === 'accepted' ? 'preparing' : order.status === 'preparing' ? 'ready' : order.status === 'ready' ? 'completed' : null;
    if (!next) return;
    setBusyKey(`status:${order.id}`);
    try {
      if (config.mode === 'demo') setNetworkOrders((current) => current.map((item) => item.id === order.id ? { ...item, status: next, updatedAt: new Date().toISOString() } : item));
      else await requireApi().updateOrderStatus(order.id, next);
      setToast({ kind: 'success', message: `${order.orderNo} 已更新為 ${statusLabel(next)}` });
    } finally { setBusyKey(''); }
  }

  async function requestReprint(orderId: string, reason: string) {
    if (!reason.trim()) throw new Error('請填寫重印原因');
    setBusyKey(`reprint:${orderId}`);
    try {
      if (config.mode !== 'demo') await requireApi().requestReprint(orderId, reason.trim());
      setToast({ kind: config.mode === 'demo' ? 'warning' : 'success', message: config.mode === 'demo' ? '已模擬重印請求，未建立雲端 print job' : '重印請求已提交，實際打印由 SMT-controlled printer agent 執行' });
    } finally { setBusyKey(''); }
  }

  function toggleSoldOut(productId: string) {
    setProducts((current) => {
      const product = current[productId];
      if (!product) return current;
      const availability = product.availability === 'available' ? 'sold_out' : 'available';
      return { ...current, [productId]: { ...product, availability } };
    });
    setToast({ kind: 'warning', message: '售罄狀態目前只在 SMT 本機試運行；正式同步需 Worker availability endpoint' });
  }

  function openTable(table: TableSession) {
    setTables((current) => current.map((item) => item.id === table.id && item.status === 'vacant' ? { ...item, status: 'occupied', openedAt: new Date().toISOString() } : item));
    setOrderMode('dinein');
    setTableId(table.id);
    setView('order');
  }

  function attachOrderToTable(order: NetworkOrder) {
    if (orderMode !== 'dinein' || !tableId) return;
    const newLines = cart.map((item) => ({ id: `table-line-${crypto.randomUUID()}`, orderId: order.id, label: `${products[item.productId]?.code ?? ''} ${products[item.productId]?.name ?? item.productId}`.trim(), amount: item.estimatedUnitPrice * item.quantity, paid: false }));
    setTables((current) => current.map((table) => table.id === tableId ? { ...table, status: 'occupied', openedAt: table.openedAt || new Date().toISOString(), lineItems: [...table.lineItems, ...newLines] } : table));
  }

  function payTableItems(tableIdValue: string, itemIds: string[], method: PaymentMethod) {
    setTables((current) => current.map((table) => {
      if (table.id !== tableIdValue) return table;
      const selected = table.lineItems.filter((line) => itemIds.includes(line.id) && !line.paid);
      const amount = selected.reduce((sum, line) => sum + line.amount, 0);
      const lineItems = table.lineItems.map((line) => itemIds.includes(line.id) ? { ...line, paid: true } : line);
      const paymentGroups = [...table.paymentGroups, { id: `table-payment-${crypto.randomUUID()}`, itemIds, method, amount, paidAt: new Date().toISOString() }];
      const finished = lineItems.length > 0 && lineItems.every((line) => line.paid);
      return { ...table, lineItems, paymentGroups, status: finished ? 'vacant' : table.status };
    }));
    setToast({ kind: 'warning', message: '堂食拆單付款已記錄於試運行本機；正式 PaymentBatch endpoint 接入後才會入帳' });
  }

  function setDeviceNumber(value: string) { setDevice(persistDeviceNumber(value)); }
  function setRuntimeMode(mode: 'demo' | 'staging' | 'live') { persistRuntimeMode(mode); }
  function requireApi() { if (!apiRef.current) throw new Error('Order API 尚未準備好'); return apiRef.current; }

  function makeDraft() {
    const now = new Date().toISOString();
    return { id: `draft-${crypto.randomUUID()}`, orderNo: '#NEW', source, mode: orderMode, tableId, customerName: '', customerPhone: '', note: orderNote, paymentMethod: 'cash' as PaymentMethod, items: cart, createdAt: now, updatedAt: now };
  }

  function makePayload(paymentMethod: PaymentMethod, customerName: string, customerPhone: string, requestedTime: string): StaffOrderDraftPayload {
    return {
      source: source === 'walk_in' ? 'smt' : source,
      customer: { name: customerName, phone: customerPhone, note: [orderNote, orderMode === 'dinein' && tableId ? `堂食：${tables.find((table) => table.id === tableId)?.tableName}` : ''].filter(Boolean).join(' · ') },
      pickup: { mode: 'pickup', requested_time: requestedTime || 'asap' },
      payment_method_id: paymentMethod,
      items: cart.map((item) => toApiItem(item, products)),
    };
  }

  return {
    config, configErrors, device, user, profile, health, view, products, categories, cart, cartQty, total, pendingIssues,
    source, orderMode, tableId, orderNote, holds, tables, networkOrders, printJobs, toast, busyKey, catalogMeta,
    occupiedTables, soldOutCount, newNetworkCount, abnormalCount,
    actions: {
      login, logout, setView, setSource, setOrderMode, setTableId, setOrderNote, setDeviceNumber, setRuntimeMode,
      quickAdd, addConfigured, updateQuantity, removeItem: (id: string) => setCart((current) => current.filter((item) => item.id !== id)), clearCart,
      holdCurrent, restoreHold, deleteHold: (id: string) => setHolds((current) => current.filter((item) => item.id !== id)), submitOrder,
      acceptOrder, advanceOrder, requestReprint, toggleSoldOut, openTable, payTableItems, clearToast: () => setToast(undefined), showToast: setToast,
    },
  };
}

function normalizeNetworkOrder(id: string, orderValue: unknown, dispatchValue: unknown): NetworkOrder {
  const order = asRecord(orderValue);
  const dispatch = asRecord(dispatchValue);
  const source = normalizeSource(order.source ?? order.origin_channel ?? dispatch.source ?? dispatch.origin_channel);
  const status = normalizeStatus(order.status ?? dispatch.status);
  const items = order.items;
  const itemCount = Array.isArray(items) ? items.reduce((sum, item) => sum + Number(asRecord(item).quantity || 1), 0) : Object.values(asRecord(items)).reduce((sum, item) => sum + Number(asRecord(item).quantity || 1), 0);
  return {
    id,
    orderNo: String(order.order_no || dispatch.order_no || `#${id.slice(-8)}`),
    source,
    status,
    total: Number(order.total ?? dispatch.total ?? dispatch.amount ?? 0),
    createdAt: String(order.created_at ?? dispatch.created_at ?? new Date().toISOString()),
    updatedAt: String(order.updated_at ?? dispatch.updated_at ?? order.created_at ?? new Date().toISOString()),
    itemCount,
    issueCount: Number(dispatch.issue_count ?? 0),
    raw: { ...dispatch, ...order },
  };
}

function normalizeSource(value: unknown): OrderSource {
  const source = String(value || '').toLowerCase();
  if (source === 'web') return 'customer_web';
  if (source === 'app') return 'customer_app';
  if (['smt', 'walk_in', 'whatsapp', 'phone', 'customer_web', 'customer_app', 'foodpanda', 'keeta'].includes(source)) return source as OrderSource;
  return 'smt';
}
function normalizeStatus(value: unknown): NetworkOrder['status'] {
  const status = String(value || 'pending').toLowerCase();
  return ['pending', 'accepted', 'preparing', 'ready', 'completed', 'cancelled', 'abnormal'].includes(status) ? status as NetworkOrder['status'] : 'abnormal';
}
function statusLabel(status: string) { return ({ preparing: '準備中', ready: '可取餐', completed: '已完成' } as Record<string, string>)[status] || status; }
function asRecord(value: unknown): Record<string, any> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {}; }
function loadLocal<T>(key: string, fallback: T): T { try { const value = localStorage.getItem(key); return value ? JSON.parse(value) as T : fallback; } catch { return fallback; } }
function saveLocal(key: string, value: unknown) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage can be unavailable in private mode */ } }
