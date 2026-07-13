export type ViewKey = 'order' | 'hold' | 'pending' | 'dinein' | 'workbench' | 'soldout' | 'reprint' | 'more';
export type ModalKey = 'note' | 'status' | 'newOrders' | 'quickEdit' | 'detail' | 'settings' | 'payment' | 'confirmClear' | 'holdCurrent' | 'pendingBatch' | 'tablePayment' | 'reprintConfirm' | null;
export type OrderMode = 'takeaway' | 'dinein';
export type OrderSource = 'walk_in' | 'whatsapp' | 'phone' | 'web' | 'app' | 'foodpanda' | 'keeta';
export type OrderStatus = 'draft' | 'held' | 'open' | 'ready' | 'completed' | 'cancelled';
export type PendingKind = 'drink' | 'rice_base' | 'sauce' | 'sold_out_replacement' | 'price_version' | 'product_invalid';
export type PendingState = 'open' | 'resolved' | 'ignored';
export type PaymentMethod = 'cash' | 'fps' | 'payme' | 'alipay' | 'wechat_pay' | 'foodpanda' | 'keeta' | 'mixed';
export type PaymentStatus = 'pending' | 'partial' | 'paid' | 'refunded';
export type PrintStatus = 'queued' | 'printing' | 'success' | 'failed' | 'cancelled';
export type HealthStatus = 'ok' | 'warning' | 'error' | 'offline';
export type AvailabilityState = 'available' | 'sold_out' | 'permanently_disabled';
export type MergeMode = 'MERGE_IDENTICAL' | 'SEPARATE_EACH';
export type PrintQuantityMode = 'EXPAND_LINES' | 'SINGLE_LINE_WITH_QTY';

export type Category = '平台餐' | '輕食' | '紫米套餐' | '紫米飯團' | '肉燥便當' | '特色便當' | '芝士薯角餐' | '小食炸物' | '飲品' | '外賣工具' | '甜品及炸物' | '咖喱便當';

export interface Product {
  id: string;
  code: string;
  name: string;
  price: number;
  category: Category;
  tags?: string[];
  availability: AvailabilityState;
  mergeMode: MergeMode;
  summary?: string;
}

export interface CartItem {
  id: string;
  productId: string;
  qty: number;
  summary?: string;
  note?: string;
  selectedRiceBallId?: string;
  selectedSnackId?: string;
  selectedDrinkId?: string;
  riceBase?: 'braised' | 'curry' | 'vegetable';
  saucePrimary?: string;
  sauceSecondary?: string;
  adjustments: string[];
  unitPrice: number;
  priceVersion: string;
  pendingIssueIds: string[];
  paidQty: number;
}

export interface OrderDraft {
  id: string;
  orderNo: string;
  source: OrderSource;
  mode: OrderMode;
  status: OrderStatus;
  tableId?: string;
  cartItemIds: string[];
  note: string;
  createdAt: string;
  updatedAt: string;
  operatorId: string;
  version: number;
}

export interface HoldOrder {
  id: string;
  title: string;
  orderSnapshot: OrderDraft;
  itemSnapshots: CartItem[];
  createdAt: string;
  operatorId: string;
}

export interface PendingIssue {
  id: string;
  orderId: string;
  cartItemId: string;
  kind: PendingKind;
  state: PendingState;
  message: string;
  eligibleReplacementIds: string[];
  priceDelta: number;
  createdAt: string;
  resolvedAt?: string;
}

export interface TableSession {
  id: string;
  tableName: string;
  status: 'vacant' | 'occupied' | 'reserved';
  orderIds: string[];
  openedAt?: string;
  reservationAt?: string;
  paidAmount: number;
  totalAmount: number;
}

export interface WorkbenchOrder {
  id: string;
  orderNo: string;
  source: OrderSource;
  status: 'new' | 'open' | 'ready' | 'completed' | 'abnormal' | 'reserved';
  amount: number;
  reservationAt?: string;
  issueCount: number;
}

export interface PaymentRecord {
  id: string;
  orderId: string;
  groupId: string;
  method: PaymentMethod;
  amount: number;
  status: PaymentStatus;
  createdAt: string;
  operatorId: string;
}

export interface PrintJob {
  id: string;
  orderId: string;
  destination: 'receipt' | 'kitchen_a' | 'kitchen_b' | 'label_a' | 'label_b';
  quantityMode: PrintQuantityMode;
  copies: number;
  status: PrintStatus;
  attemptCount: number;
  lastError?: string;
  createdAt: string;
}

export interface SystemHealthItem {
  key: 'wifi' | 'cloud' | 'device' | 'api' | 'printer' | 'sync';
  label: string;
  status: HealthStatus;
  issueCount: number;
  lastCheckedAt: string;
  message: string;
}

export interface AvailabilityRecord {
  productId: string;
  state: AvailabilityState;
  updatedAt: string;
  updatedBy: string;
  autoRestoreAt?: string;
}

export interface ShortcutConfig {
  key: ViewKey | 'note' | 'lookup' | 'dayClose' | 'sales' | 'deviceStatus' | 'printManager';
  label: string;
  icon: string;
  fixed: boolean;
  enabled: boolean;
  order: number;
}

export interface SMTSettings {
  categoryColumns: 3 | 4 | 5 | 6;
  productColumns: 3 | 4 | 5;
  defaultMergeMode: MergeMode;
  riceBasePriority: Array<'braised' | 'curry' | 'vegetable'>;
  shortcutPageSize: 8;
  shortcuts: ShortcutConfig[];
  printQuantityByDestination: Record<PrintJob['destination'], PrintQuantityMode>;
}

export interface UIState {
  view: ViewKey;
  modal: ModalKey;
  activeCategory: Category;
  quickTag: string;
  activeCartItemId?: string;
  selectedTableId?: string;
  selectedOrderId?: string;
  shortcutPage: number;
  toast?: { kind: 'success' | 'error' | 'info'; message: string };
  loadingKey?: string;
}

export interface AuditEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  operatorId: string;
  createdAt: string;
  detail: string;
}

export interface SMTState {
  ui: UIState;
  products: Record<string, Product>;
  cartItems: Record<string, CartItem>;
  currentOrder: OrderDraft;
  holdOrders: Record<string, HoldOrder>;
  pendingIssues: Record<string, PendingIssue>;
  tableSessions: Record<string, TableSession>;
  workbenchOrders: Record<string, WorkbenchOrder>;
  payments: Record<string, PaymentRecord>;
  printJobs: Record<string, PrintJob>;
  availability: Record<string, AvailabilityRecord>;
  systemHealth: Record<SystemHealthItem['key'], SystemHealthItem>;
  settings: SMTSettings;
  auditLog: AuditEntry[];
}

export type SMTAction =
  | { type: 'NAVIGATE'; view: ViewKey }
  | { type: 'OPEN_MODAL'; modal: Exclude<ModalKey, null>; activeCartItemId?: string; selectedOrderId?: string }
  | { type: 'CLOSE_MODAL' }
  | { type: 'SET_CATEGORY'; category: Category }
  | { type: 'SET_QUICK_TAG'; tag: string }
  | { type: 'SET_SHORTCUT_PAGE'; page: number }
  | { type: 'SHOW_TOAST'; kind: 'success' | 'error' | 'info'; message: string }
  | { type: 'CLEAR_TOAST' }
  | { type: 'ADD_CART_ITEM'; item: CartItem }
  | { type: 'UPDATE_CART_ITEM'; item: CartItem }
  | { type: 'REMOVE_CART_ITEM'; itemId: string }
  | { type: 'CLEAR_CART' }
  | { type: 'SET_ORDER_NOTE'; note: string }
  | { type: 'SET_ORDER_MODE'; mode: OrderMode; tableId?: string }
  | { type: 'CREATE_HOLD'; hold: HoldOrder }
  | { type: 'RESTORE_HOLD'; holdId: string }
  | { type: 'DELETE_HOLD'; holdId: string }
  | { type: 'ADD_PENDING_ISSUE'; issue: PendingIssue }
  | { type: 'RESOLVE_PENDING'; issueId: string }
  | { type: 'RESOLVE_PENDING_BATCH'; kind: PendingKind; replacementProductId?: string; priceDelta?: number }
  | { type: 'SELECT_TABLE'; tableId?: string }
  | { type: 'UPDATE_TABLE'; table: TableSession }
  | { type: 'UPSERT_WORKBENCH_ORDER'; order: WorkbenchOrder }
  | { type: 'ADD_PAYMENT'; payment: PaymentRecord }
  | { type: 'UPSERT_PRINT_JOB'; job: PrintJob }
  | { type: 'SET_AVAILABILITY'; productId: string; state: AvailabilityState; updatedBy: string; updatedAt: string; autoRestoreAt?: string }
  | { type: 'UPDATE_HEALTH'; item: SystemHealthItem }
  | { type: 'UPDATE_SETTINGS'; settings: Partial<SMTSettings> }
  | { type: 'ADD_AUDIT'; entry: AuditEntry };

const now = () => new Date().toISOString();

const appendAudit = (state: SMTState, action: string, entityType: string, entityId: string, detail: string): SMTState => ({
  ...state,
  auditLog: [
    ...state.auditLog,
    { id: `audit-${Date.now()}-${state.auditLog.length}`, action, entityType, entityId, operatorId: state.currentOrder.operatorId, createdAt: now(), detail },
  ],
});

export function smtReducer(state: SMTState, action: SMTAction): SMTState {
  switch (action.type) {
    case 'NAVIGATE':
      return { ...state, ui: { ...state.ui, view: action.view, modal: null, loadingKey: undefined } };
    case 'OPEN_MODAL':
      return { ...state, ui: { ...state.ui, modal: action.modal, activeCartItemId: action.activeCartItemId ?? state.ui.activeCartItemId, selectedOrderId: action.selectedOrderId ?? state.ui.selectedOrderId } };
    case 'CLOSE_MODAL':
      return { ...state, ui: { ...state.ui, modal: null, loadingKey: undefined } };
    case 'SET_CATEGORY':
      return { ...state, ui: { ...state.ui, activeCategory: action.category, quickTag: '全部' } };
    case 'SET_QUICK_TAG':
      return { ...state, ui: { ...state.ui, quickTag: action.tag } };
    case 'SET_SHORTCUT_PAGE':
      return { ...state, ui: { ...state.ui, shortcutPage: Math.max(0, action.page) } };
    case 'SHOW_TOAST':
      return { ...state, ui: { ...state.ui, toast: { kind: action.kind, message: action.message } } };
    case 'CLEAR_TOAST':
      return { ...state, ui: { ...state.ui, toast: undefined } };
    case 'ADD_CART_ITEM': { 
      const next = {
        ...state,
        cartItems: { ...state.cartItems, [action.item.id]: action.item },
        currentOrder: { ...state.currentOrder, cartItemIds: [...state.currentOrder.cartItemIds, action.item.id], updatedAt: now(), version: state.currentOrder.version + 1 },
      };
      return appendAudit(next, 'cart.add', 'cart_item', action.item.id, action.item.productId);
    }
    case 'UPDATE_CART_ITEM': {
      const next = { ...state, cartItems: { ...state.cartItems, [action.item.id]: action.item }, currentOrder: { ...state.currentOrder, updatedAt: now(), version: state.currentOrder.version + 1 } };
      return appendAudit(next, 'cart.update', 'cart_item', action.item.id, action.item.productId);
    }
    case 'REMOVE_CART_ITEM': {
      const { [action.itemId]: _removed, ...remaining } = state.cartItems;
      const next = { ...state, cartItems: remaining, currentOrder: { ...state.currentOrder, cartItemIds: state.currentOrder.cartItemIds.filter(id => id !== action.itemId), updatedAt: now(), version: state.currentOrder.version + 1 } };
      return appendAudit(next, 'cart.remove', 'cart_item', action.itemId, 'removed');
    }
    case 'CLEAR_CART': {
      const next = { ...state, cartItems: {}, currentOrder: { ...state.currentOrder, cartItemIds: [], note: '', updatedAt: now(), version: state.currentOrder.version + 1 } };
      return appendAudit(next, 'cart.clear', 'order', state.currentOrder.id, 'all cart items removed');
    }
    case 'SET_ORDER_NOTE':
      return { ...state, currentOrder: { ...state.currentOrder, note: action.note, updatedAt: now(), version: state.currentOrder.version + 1 } };
    case 'SET_ORDER_MODE':
      return { ...state, currentOrder: { ...state.currentOrder, mode: action.mode, tableId: action.tableId, updatedAt: now(), version: state.currentOrder.version + 1 } };
    case 'CREATE_HOLD': {
      const next = { ...state, holdOrders: { ...state.holdOrders, [action.hold.id]: action.hold }, cartItems: {}, currentOrder: { ...state.currentOrder, cartItemIds: [], note: '', status: 'draft', updatedAt: now(), version: state.currentOrder.version + 1 } };
      return appendAudit(next, 'hold.create', 'hold_order', action.hold.id, action.hold.title);
    }
    case 'RESTORE_HOLD': {
      const hold = state.holdOrders[action.holdId];
      if (!hold) return state;
      const restoredItems = Object.fromEntries(hold.itemSnapshots.map(item => [item.id, item]));
      const { [action.holdId]: _removed, ...remainingHolds } = state.holdOrders;
      const next = { ...state, holdOrders: remainingHolds, cartItems: restoredItems, currentOrder: { ...hold.orderSnapshot, status: 'draft', updatedAt: now(), version: hold.orderSnapshot.version + 1 }, ui: { ...state.ui, view: 'order', modal: null, toast: { kind: 'success', message: `已恢復 ${hold.title}` } as const } };
      return appendAudit(next, 'hold.restore', 'hold_order', action.holdId, hold.title);
    }
    case 'DELETE_HOLD': {
      const { [action.holdId]: _removed, ...remaining } = state.holdOrders;
      return appendAudit({ ...state, holdOrders: remaining }, 'hold.delete', 'hold_order', action.holdId, 'deleted');
    }
    case 'ADD_PENDING_ISSUE':
      return { ...state, pendingIssues: { ...state.pendingIssues, [action.issue.id]: action.issue } };
    case 'RESOLVE_PENDING': {
      const issue = state.pendingIssues[action.issueId];
      if (!issue) return state;
      return { ...state, pendingIssues: { ...state.pendingIssues, [action.issueId]: { ...issue, state: 'resolved', resolvedAt: now() } } };
    }
    case 'RESOLVE_PENDING_BATCH': {
      const updated = Object.fromEntries(Object.entries(state.pendingIssues).map(([id, issue]) => [id, issue.kind === action.kind && issue.state === 'open' ? { ...issue, state: 'resolved' as const, resolvedAt: now(), priceDelta: action.priceDelta ?? issue.priceDelta } : issue]));
      return appendAudit({ ...state, pendingIssues: updated }, 'pending.resolve_batch', 'pending_issue', action.kind, action.replacementProductId ?? 'default');
    }
    case 'SELECT_TABLE':
      return { ...state, ui: { ...state.ui, selectedTableId: action.tableId } };
    case 'UPDATE_TABLE':
      return { ...state, tableSessions: { ...state.tableSessions, [action.table.id]: action.table } };
    case 'UPSERT_WORKBENCH_ORDER':
      return { ...state, workbenchOrders: { ...state.workbenchOrders, [action.order.id]: action.order } };
    case 'ADD_PAYMENT': {
      const next = { ...state, payments: { ...state.payments, [action.payment.id]: action.payment } };
      return appendAudit(next, 'payment.add', 'payment', action.payment.id, `${action.payment.method}:${action.payment.amount}`);
    }
    case 'UPSERT_PRINT_JOB':
      return { ...state, printJobs: { ...state.printJobs, [action.job.id]: action.job } };
    case 'SET_AVAILABILITY': {
      const product = state.products[action.productId];
      const next = {
        ...state,
        products: product ? { ...state.products, [action.productId]: { ...product, availability: action.state } } : state.products,
        availability: { ...state.availability, [action.productId]: { productId: action.productId, state: action.state, updatedAt: action.updatedAt, updatedBy: action.updatedBy, autoRestoreAt: action.autoRestoreAt } },
      };
      return appendAudit(next, 'availability.set', 'product', action.productId, action.state);
    }
    case 'UPDATE_HEALTH':
      return { ...state, systemHealth: { ...state.systemHealth, [action.item.key]: action.item } };
    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.settings } };
    case 'ADD_AUDIT':
      return { ...state, auditLog: [...state.auditLog, action.entry] };
    default:
      return state;
  }
}

export const selectCartItems = (state: SMTState): CartItem[] => state.currentOrder.cartItemIds.map(id => state.cartItems[id]).filter(Boolean);
export const selectCartQty = (state: SMTState): number => selectCartItems(state).reduce((sum, item) => sum + item.qty, 0);
export const selectCartTotal = (state: SMTState): number => selectCartItems(state).reduce((sum, item) => sum + item.unitPrice * item.qty, 0);
export const selectOpenPendingIssues = (state: SMTState): PendingIssue[] => Object.values(state.pendingIssues).filter(issue => issue.state === 'open');
export const selectPendingCountByKind = (state: SMTState, kind: PendingKind): number => selectOpenPendingIssues(state).filter(issue => issue.kind === kind).length;
export const selectOccupiedTableCount = (state: SMTState): number => Object.values(state.tableSessions).filter(table => table.status === 'occupied').length;
export const selectNewNetworkOrderCount = (state: SMTState): number => Object.values(state.workbenchOrders).filter(order => order.status === 'new').length;
export const selectAbnormalOrderCount = (state: SMTState): number => Object.values(state.workbenchOrders).filter(order => order.status === 'abnormal').length;
export const selectSoldOutCount = (state: SMTState): number => Object.values(state.availability).filter(record => record.state === 'sold_out').length;
export const selectHealthIssueCount = (state: SMTState): number => Object.values(state.systemHealth).reduce((sum, item) => sum + item.issueCount, 0);

const baseProducts: Product[] = [
  { id:'p1', code:'F1', name:'招牌雞扒紫米飯團餐', price:51, category:'平台餐', tags:['雞'], availability:'available', mergeMode:'MERGE_IDENTICAL' },
  { id:'p2', code:'F2', name:'鹽燒鯖魚紫米飯團餐', price:50, category:'平台餐', tags:['魚'], availability:'available', mergeMode:'MERGE_IDENTICAL' },
  { id:'p3', code:'F3', name:'香煎豬扒紫米飯團餐', price:52, category:'平台餐', tags:['豬'], availability:'available', mergeMode:'MERGE_IDENTICAL' },
  { id:'p4', code:'F4', name:'韓式燒牛紫米飯團餐', price:53, category:'平台餐', tags:['牛'], availability:'available', mergeMode:'MERGE_IDENTICAL' },
  { id:'p5', code:'12', name:'古早鹽酥雞肉燥飯', price:52, category:'肉燥便當', tags:['雞'], availability:'available', mergeMode:'SEPARATE_EACH', summary:'飯底：肉燥飯' },
  { id:'p6', code:'C12', name:'古早鹽酥雞咖喱飯', price:52, category:'咖喱便當', tags:['雞'], availability:'available', mergeMode:'SEPARATE_EACH', summary:'飯底：咖喱飯' },
  { id:'p7', code:'V12', name:'古早鹽酥雞菜飯', price:52, category:'特色便當', tags:['雞'], availability:'available', mergeMode:'SEPARATE_EACH', summary:'飯底：菜飯' },
  { id:'p8', code:'S1', name:'紫米能量沙律', price:48, category:'輕食', tags:['素'], availability:'available', mergeMode:'SEPARATE_EACH', summary:'醬汁：不需要' },
  { id:'p9', code:'S01', name:'薯角', price:18, category:'小食炸物', tags:['素'], availability:'sold_out', mergeMode:'MERGE_IDENTICAL' },
  { id:'p10', code:'D01', name:'台式奶茶', price:18, category:'飲品', tags:['飲品'], availability:'available', mergeMode:'MERGE_IDENTICAL' },
  { id:'p11', code:'D02', name:'凍檸檬茶', price:20, category:'飲品', tags:['飲品'], availability:'available', mergeMode:'MERGE_IDENTICAL' },
];

const productMap = Object.fromEntries(baseProducts.map(product => [product.id, product]));
const seedItem = (id: string, productId: string, summary?: string): CartItem => ({ id, productId, qty:1, summary, adjustments:[], unitPrice:productMap[productId].price, priceVersion:'local-v1', pendingIssueIds:[], paidQty:0 });

export const initialSMTState: SMTState = {
  ui: { view:'order', modal:null, activeCategory:'平台餐', quickTag:'全部', shortcutPage:0 },
  products: productMap,
  cartItems: {
    c1: seedItem('c1','p1','小食：薯角 · 待選飲品'),
    c2: seedItem('c2','p5','飯底：肉燥飯'),
    c3: seedItem('c3','p8','醬汁：不需要'),
  },
  currentOrder: { id:'order-draft-1', orderNo:'#0128', source:'walk_in', mode:'takeaway', status:'draft', cartItemIds:['c1','c2','c3'], note:'', createdAt:now(), updatedAt:now(), operatorId:'morefun', version:1 },
  holdOrders: {},
  pendingIssues: {
    pending1: { id:'pending1', orderId:'order-draft-1', cartItemId:'c1', kind:'drink', state:'open', message:'飯團餐待補飲品', eligibleReplacementIds:['p10','p11'], priceDelta:0, createdAt:now() },
  },
  tableSessions: Object.fromEntries(['1號枱','2號枱','3號枱','4號枱','5號枱','6號枱','7號枱','8號枱','院外枱'].map((tableName,index) => [`table-${index+1}`, { id:`table-${index+1}`, tableName, status:index===1||index===5?'occupied':'vacant', orderIds:[], openedAt:index===1||index===5?now():undefined, paidAmount:index===5?72:68, totalAmount:index===1?186:index===5?72:0 } as TableSession])),
  workbenchOrders: {
    w1:{ id:'w1', orderNo:'#W-1048', source:'web', status:'new', amount:126, issueCount:0 },
    w2:{ id:'w2', orderNo:'#A-2203', source:'app', status:'open', amount:89, issueCount:0 },
    w3:{ id:'w3', orderNo:'#FP-771', source:'foodpanda', status:'ready', amount:214, issueCount:0 },
    w4:{ id:'w4', orderNo:'#T-019', source:'phone', status:'abnormal', amount:67, issueCount:1 },
  },
  payments: {},
  printJobs: {},
  availability: Object.fromEntries(baseProducts.map(product => [product.id, { productId:product.id, state:product.availability, updatedAt:now(), updatedBy:'system' } as AvailabilityRecord])),
  systemHealth: {
    wifi:{ key:'wifi', label:'Wi-Fi', status:'ok', issueCount:0, lastCheckedAt:now(), message:'網絡正常' },
    cloud:{ key:'cloud', label:'雲端', status:'ok', issueCount:0, lastCheckedAt:now(), message:'雲端正常' },
    device:{ key:'device', label:'裝置', status:'ok', issueCount:0, lastCheckedAt:now(), message:'裝置正常' },
    api:{ key:'api', label:'API', status:'ok', issueCount:0, lastCheckedAt:now(), message:'API 正常' },
    printer:{ key:'printer', label:'打印', status:'ok', issueCount:0, lastCheckedAt:now(), message:'打印正常' },
    sync:{ key:'sync', label:'同步', status:'warning', issueCount:2, lastCheckedAt:now(), message:'有 2 項待同步' },
  },
  settings: {
    categoryColumns:6,
    productColumns:4,
    defaultMergeMode:'MERGE_IDENTICAL',
    riceBasePriority:['braised','curry','vegetable'],
    shortcutPageSize:8,
    shortcuts:[
      { key:'order', label:'點單', icon:'⌂', fixed:true, enabled:true, order:0 },
      { key:'hold', label:'掛單／取單', icon:'▤', fixed:true, enabled:true, order:1 },
      { key:'pending', label:'待補／重組', icon:'♨', fixed:true, enabled:true, order:2 },
      { key:'dinein', label:'堂食', icon:'♧', fixed:true, enabled:true, order:3 },
      { key:'workbench', label:'工作台', icon:'▦', fixed:true, enabled:true, order:4 },
      { key:'soldout', label:'售罄', icon:'▱', fixed:false, enabled:true, order:5 },
      { key:'reprint', label:'重印', icon:'▣', fixed:false, enabled:true, order:6 },
      { key:'more', label:'更多入口', icon:'›', fixed:false, enabled:true, order:7 },
    ],
    printQuantityByDestination:{ receipt:'SINGLE_LINE_WITH_QTY', kitchen_a:'EXPAND_LINES', kitchen_b:'EXPAND_LINES', label_a:'EXPAND_LINES', label_b:'EXPAND_LINES' },
  },
  auditLog:[],
};
