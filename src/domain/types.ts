export type RuntimeMode = 'demo' | 'staging' | 'live';
export type ViewKey = 'order' | 'workbench' | 'dinein' | 'hold' | 'pending' | 'lookup' | 'soldout' | 'reprint' | 'more';
export type OrderSource = 'smt' | 'walk_in' | 'whatsapp' | 'phone' | 'customer_web' | 'customer_app' | 'foodpanda' | 'keeta';
export type OrderMode = 'takeaway' | 'dinein';
export type PaymentMethod = 'cash' | 'fps' | 'payme' | 'alipay' | 'wechat_pay' | 'foodpanda' | 'keeta' | 'mixed' | 'unclassified';
export type ProductAvailability = 'available' | 'sold_out' | 'permanently_disabled';
export type ProductRuleKind = 'simple' | 'bento' | 'fixed_set' | 'custom_set' | 'rice_ball' | 'salad' | 'snack' | 'drink';
export type PendingKind = 'rice_base' | 'rice_ball' | 'snack' | 'drink' | 'sauce' | 'sold_out' | 'price_version' | 'invalid_product';
export type NetworkOrderStatus = 'pending' | 'accepted' | 'preparing' | 'ready' | 'completed' | 'cancelled' | 'abnormal';

export interface FirebaseUserIdentity { uid: string; email: string; displayName: string; }
export interface StaffProfile { uid: string; role: 'smt' | 'admin' | 'smm' | 'printer' | 'unknown'; active: boolean; displayName: string; deviceNumber?: string; }
export interface DeviceIdentity { surface: 'smt'; deviceId: string; deviceNumber: string; }
export interface Product { id: string; code: string; name: string; category: string; price: number; tags: string[]; availability: ProductAvailability; ruleKind: ProductRuleKind; imageUrl?: string; tier?: 'A' | 'B' | 'C' | 'D'; raw: Record<string, unknown>; }
export interface CartSelections { riceBase?: 'braised' | 'curry' | 'vegetable'; riceAmount?: 'normal' | 'less' | 'half' | 'more'; noEgg?: boolean; riceBallId?: string; secondRiceBallId?: string; snackId?: string; drinkId?: string; noDrink?: boolean; saucePrimary?: string; sauceSecondary?: string; doubleSauce?: boolean; ice?: 'normal' | 'less' | 'no_ice'; sweetness?: 'normal' | 'less' | 'no_sugar'; }
export interface PendingIssue { kind: PendingKind; message: string; }
export interface CartItem { id: string; productId: string; quantity: number; selections: CartSelections; note: string; estimatedUnitPrice: number; summary: string; pendingIssues: PendingIssue[]; addedAt: string; }
export interface OrderDraft { id: string; orderNo: string; source: OrderSource; mode: OrderMode; tableId?: string; customerName: string; customerPhone: string; note: string; paymentMethod: PaymentMethod; items: CartItem[]; createdAt: string; updatedAt: string; }
export interface HoldOrder { id: string; title: string; draft: OrderDraft; createdAt: string; }
export interface NetworkOrder { id: string; orderNo: string; source: OrderSource; status: NetworkOrderStatus; total: number; createdAt: string; updatedAt: string; itemCount: number; issueCount: number; raw: Record<string, unknown>; }
export interface TableLineItem { id: string; orderId: string; label: string; amount: number; paid: boolean; }
export interface TablePaymentGroup { id: string; itemIds: string[]; method?: PaymentMethod; amount: number; paidAt?: string; }
export interface TableSession { id: string; tableName: string; status: 'vacant' | 'occupied' | 'reserved'; lineItems: TableLineItem[]; paymentGroups: TablePaymentGroup[]; openedAt?: string; reservationAt?: string; }
export interface PaymentPart { id: string; method: PaymentMethod; amount: number; }
export interface CheckoutState { paymentParts: PaymentPart[]; customerName: string; customerPhone: string; requestedTime: string; }
export interface RuntimeHealth { firebase: 'idle' | 'connecting' | 'online' | 'offline' | 'error'; api: 'idle' | 'checking' | 'ready' | 'disabled' | 'offline' | 'error'; auth: 'signed_out' | 'signed_in' | 'forbidden'; realtime: 'idle' | 'connecting' | 'online' | 'offline' | 'error'; lastMessage: string; }
export interface ToastMessage { kind: 'success' | 'error' | 'info' | 'warning'; message: string; }
export interface ApiErrorShape extends Error { code?: string; status?: number; }
