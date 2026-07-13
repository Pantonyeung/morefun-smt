import type { NetworkOrder, Product, TableSession } from './types';
import { inferRuleKind } from './businessRules';

const seed: Array<[string, string, number, string, string[]]> = [
  ['F1', '招牌雞扒紫米飯團餐', 51, '紫米套餐', ['雞']],
  ['F2', '鹽燒鯖魚紫米飯團餐', 50, '紫米套餐', ['魚']],
  ['F3', '香煎豬扒紫米飯團餐', 52, '紫米套餐', ['豬']],
  ['F4', '韓式燒牛紫米飯團餐', 53, '紫米套餐', ['牛']],
  ['12', '古早鹽酥雞肉燥飯', 52, '肉燥便當', ['雞']],
  ['C12', '古早鹽酥雞咖喱飯', 52, '咖喱便當', ['雞']],
  ['V12', '古早鹽酥雞菜飯', 52, '特色便當', ['雞']],
  ['RB41', '粟米吞拿魚紫米飯團', 41, '紫米飯團', ['魚']],
  ['RB43', '照燒雞扒紫米飯團', 43, '紫米飯團', ['雞']],
  ['RB45', '韓式燒牛紫米飯團', 45, '紫米飯團', ['牛']],
  ['S1', '紫米能量沙律', 48, '輕食', ['素']],
  ['S01', '薯角', 18, '小食炸物', ['素']],
  ['S02', '鹽酥雞', 23, '小食炸物', ['雞']],
  ['D01', '台式奶茶', 18, '飲品', ['飲品']],
  ['D02', '凍檸檬茶', 20, '飲品', ['飲品']],
  ['D03', '玄米冷泡茶', 22, '飲品', ['飲品']],
  ['D04', '手打檸檬茶', 25, '飲品', ['飲品']],
];

export const demoProducts: Record<string, Product> = Object.fromEntries(seed.map(([code, name, price, category, tags], index) => {
  const id = `demo-${index + 1}`;
  const partial = { code, name, category };
  const product: Product = {
    id,
    code,
    name,
    price,
    category,
    tags: [...tags],
    availability: code === 'S01' ? 'sold_out' : 'available',
    ruleKind: inferRuleKind(partial),
    tier: price === 41 ? 'A' : price === 43 ? 'B' : price === 45 ? 'C' : price === 47 ? 'D' : undefined,
    raw: { demo: true },
  };
  return [id, product];
}));

export const demoNetworkOrders: NetworkOrder[] = [
  { id: 'demo-web-1', orderNo: '#W-1048', source: 'customer_web', status: 'pending', total: 126, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), itemCount: 2, issueCount: 0, raw: { demo: true } },
  { id: 'demo-app-1', orderNo: '#A-2203', source: 'customer_app', status: 'accepted', total: 89, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), itemCount: 1, issueCount: 0, raw: { demo: true } },
  { id: 'demo-phone-1', orderNo: '#T-019', source: 'phone', status: 'abnormal', total: 67, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), itemCount: 1, issueCount: 1, raw: { demo: true } },
];

export const demoTables: TableSession[] = ['1號枱', '2號枱', '3號枱', '4號枱', '5號枱', '6號枱', '7號枱', '8號枱', '院外枱'].map((tableName, index) => ({
  id: `table-${index + 1}`,
  tableName,
  status: index === 1 ? 'occupied' : 'vacant',
  openedAt: index === 1 ? new Date().toISOString() : undefined,
  lineItems: index === 1 ? [
    { id: 'line-a', orderId: 'demo-table-order', label: 'F1 招牌雞扒紫米飯團餐', amount: 51, paid: false },
    { id: 'line-b', orderId: 'demo-table-order', label: 'D01 台式奶茶', amount: 18, paid: false },
    { id: 'line-c', orderId: 'demo-table-order', label: '12 古早鹽酥雞肉燥飯', amount: 52, paid: false },
  ] : [],
  paymentGroups: [],
}));
