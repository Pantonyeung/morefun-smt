import { useMemo, useState } from 'react';

type ProductType = '飯團' | '便當' | '小食' | '飲品';
type QuickTag = '全部' | '雞' | '豬' | '魚' | '芝士' | '辣' | '素';
type ChoiceRole = 'riceBall' | 'snack' | 'drink';

type Product = {
  id: string;
  code: string;
  name: string;
  type: ProductType;
  price: number;
  tags: QuickTag[];
};

type CartItem = {
  id: string;
  product: Product;
  qty: number;
  riceBall?: Product;
  snack?: Product;
  drink?: Product;
};

const products: Product[] = [
  { id: 'f1', code: 'F1', name: '招牌雞扒飯團', type: '飯團', price: 41, tags: ['雞'] },
  { id: 'f2', code: 'F2', name: '黑椒脆豬飯團', type: '飯團', price: 43, tags: ['豬'] },
  { id: 'f3', code: 'F3', name: '天神炸雞飯團', type: '飯團', price: 45, tags: ['雞', '辣'] },
  { id: 'f4', code: 'F4', name: '鮭魚飯團', type: '飯團', price: 45, tags: ['魚'] },
  { id: 'f5', code: 'F5', name: '芝士雞絲飯團', type: '飯團', price: 47, tags: ['雞', '芝士'] },
  { id: 'f6', code: 'F6', name: '泡菜豬肉飯團', type: '飯團', price: 47, tags: ['豬', '辣'] },
  { id: 'b1', code: '12', name: '肉燥飯便當', type: '便當', price: 48, tags: ['豬'] },
  { id: 'b2', code: 'C12', name: '咖喱雞扒便當', type: '便當', price: 52, tags: ['雞'] },
  { id: 'b3', code: 'V12', name: '菜飯便當', type: '便當', price: 46, tags: ['素'] },
  { id: 's1', code: 'S01', name: '薯角', type: '小食', price: 18, tags: ['素'] },
  { id: 's2', code: 'S02', name: '天神炸雞', type: '小食', price: 24, tags: ['雞', '辣'] },
  { id: 's3', code: 'S03', name: '雞翼', type: '小食', price: 22, tags: ['雞'] },
  { id: 'd1', code: 'D01', name: '台式奶茶', type: '飲品', price: 8, tags: [] },
  { id: 'd2', code: 'D02', name: '手打檸檬茶', type: '飲品', price: 10, tags: [] },
];

const categories: ProductType[] = ['飯團', '便當', '小食', '飲品'];
const quickTags: QuickTag[] = ['全部', '雞', '豬', '魚', '芝士', '辣', '素'];

export default function App() {
  const [category, setCategory] = useState<ProductType>('飯團');
  const [globalTag, setGlobalTag] = useState<QuickTag>('全部');
  const [cart, setCart] = useState<CartItem[]>([
    {
      id: 'cart-1',
      product: products[0],
      qty: 1,
      riceBall: products[0],
      snack: products.find((item) => item.id === 's1'),
      drink: products.find((item) => item.id === 'd1'),
    },
  ]);
  const [editingId, setEditingId] = useState<string | null>('cart-1');
  const [choiceRole, setChoiceRole] = useState<ChoiceRole | null>(null);
  const [localTag, setLocalTag] = useState<QuickTag>('全部');

  const visibleProducts = useMemo(() => {
    if (globalTag !== '全部') {
      return products.filter((product) => product.tags.includes(globalTag));
    }
    return products.filter((product) => product.type === category);
  }, [category, globalTag]);

  const editingItem = cart.find((item) => item.id === editingId) ?? null;
  const candidateType: ProductType | null =
    choiceRole === 'riceBall' ? '飯團' : choiceRole === 'snack' ? '小食' : choiceRole === 'drink' ? '飲品' : null;

  const candidates = useMemo(() => {
    if (!candidateType) return [];
    return products.filter((product) => {
      const isInCurrentPool = product.type === candidateType;
      const matchesTag = localTag === '全部' || product.tags.includes(localTag);
      return isInCurrentPool && matchesTag;
    });
  }, [candidateType, localTag]);

  const addProduct = (product: Product) => {
    setCart((current) => [...current, { id: `cart-${Date.now()}`, product, qty: 1 }]);
  };

  const updateQty = (id: string, delta: number) => {
    setCart((current) => current
      .map((item) => item.id === id ? { ...item, qty: Math.max(0, item.qty + delta) } : item)
      .filter((item) => item.qty > 0));
  };

  const chooseCandidate = (product: Product) => {
    if (!editingId || !choiceRole) return;
    setCart((current) => current.map((item) => item.id === editingId ? { ...item, [choiceRole]: product } : item));
    setChoiceRole(null);
    setLocalTag('全部');
  };

  const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);
  const total = cart.reduce((sum, item) => sum + item.product.price * item.qty, 0);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div><strong>磨飯 SMT</strong><span>單號 SMT-0001</span></div>
        <div className="status-group"><span>網絡正常</span><span>API 正常</span><span>打印正常</span><button>更多</button></div>
      </header>

      <main className="workspace">
        <section className="cart-panel">
          <div className="mode-tabs"><button className="active">開單</button><button>堂食</button><button>工作台</button></div>
          <div className="cart-list">
            {cart.map((item, index) => (
              <article className={`cart-item ${editingId === item.id ? 'editing' : ''}`} key={item.id}>
                <div className="cart-item-head">
                  <div><small>商品 {index + 1}</small><h3>{item.product.code} {item.product.name}</h3></div>
                  <button className="more-button" onClick={() => { setEditingId(item.id); setChoiceRole(null); }}>⋯<span>修改</span></button>
                </div>
                <div className="selection-summary">
                  {item.riceBall && <span>飯團：{item.riceBall.name}</span>}
                  {item.snack && <span>小食：{item.snack.name}</span>}
                  {item.drink && <span>飲品：{item.drink.name}</span>}
                </div>
                <div className="qty-row">
                  <button onClick={() => updateQty(item.id, -1)}>−</button><strong>{item.qty}</strong><button onClick={() => updateQty(item.id, 1)}>＋</button><b>${item.product.price * item.qty}</b>
                </div>
              </article>
            ))}
          </div>
          <div className="cart-actions"><button>掛單／取單</button><button>補選／重組<small>處理整張單</small></button></div>
          <div className="checkout-bar"><span>{totalQty} 件</span><strong>${total}</strong><button>收款</button></div>
        </section>

        <section className="product-panel">
          <div className="category-row">
            {categories.map((item) => <button key={item} className={category === item && globalTag === '全部' ? 'active' : ''} onClick={() => { setCategory(item); setGlobalTag('全部'); }}>{item}</button>)}
          </div>
          <div className="quick-find" aria-label="全店快找">
            <span>全店快找</span>
            {quickTags.map((tag) => <button key={tag} className={globalTag === tag ? 'active' : ''} onClick={() => setGlobalTag(tag)}>{tag}</button>)}
          </div>
          <div className="product-grid">
            {visibleProducts.map((product) => (
              <button className="product-card" key={product.id} onClick={() => addProduct(product)}>
                <span className="product-code">{product.code}</span><small className="product-type">{product.type}</small>
                <strong>{product.name}</strong><b>${product.price}</b><small>按一下直接加入</small>
              </button>
            ))}
          </div>
        </section>

        {editingItem && (
          <aside className="edit-drawer">
            {choiceRole === null ? (
              <>
                <div className="drawer-head"><div><small>快速修改｜商品</small><h2>{editingItem.product.code} {editingItem.product.name}</h2></div><button onClick={() => setEditingId(null)}>×</button></div>
                <button className="edit-row" onClick={() => setChoiceRole('riceBall')}><span>飯團</span><strong>{editingItem.riceBall?.name ?? '未選擇'}</strong><b>›</b></button>
                <button className="edit-row" onClick={() => setChoiceRole('snack')}><span>小食</span><strong>{editingItem.snack?.name ?? '未選擇'}</strong><b>›</b></button>
                <button className="edit-row" onClick={() => setChoiceRole('drink')}><span>飲品</span><strong>{editingItem.drink?.name ?? '未選擇'}</strong><b>›</b></button>
                <div className="drawer-qty"><span>數量</span><button onClick={() => updateQty(editingItem.id, -1)}>−</button><strong>{editingItem.qty}</strong><button onClick={() => updateQty(editingItem.id, 1)}>＋</button></div>
                <button className="edit-row"><span>備註</span><strong>新增備註</strong><b>›</b></button>
                <button className="detail-link">查看完整詳情 ›</button>
                <button className="complete-button" onClick={() => setEditingId(null)}>完成</button>
              </>
            ) : (
              <>
                <div className="drawer-head"><div><small>類內快找</small><h2>{candidateType}選擇</h2></div><button onClick={() => { setChoiceRole(null); setLocalTag('全部'); }}>‹</button></div>
                <p className="scope-note">只顯示目前可選的「{candidateType}」，不會混入其他產品。</p>
                <div className="local-tags">
                  {quickTags.map((tag) => <button key={tag} className={localTag === tag ? 'active' : ''} onClick={() => setLocalTag(tag)}>{tag}</button>)}
                </div>
                <div className="candidate-grid">
                  {candidates.length > 0 ? candidates.map((product) => (
                    <button key={product.id} onClick={() => chooseCandidate(product)}><small>{product.code}</small><strong>{product.name}</strong><b>${product.price}</b></button>
                  )) : <div className="empty-state">目前{candidateType}選擇中，沒有「{localTag}」類選項。<button onClick={() => setLocalTag('全部')}>查看全部{candidateType}</button></div>}
                </div>
              </>
            )}
          </aside>
        )}
      </main>
    </div>
  );
}
