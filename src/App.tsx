import { useMemo, useState } from 'react';

type Category = '平台餐' | '輕食' | '紫米套餐' | '紫米飯團' | '肉燥便當' | '特色便當' | '芝士薯角餐' | '小食炸物' | '飲品' | '外賣工具' | '甜品及炸物' | '咖喱便當';
type Product = { id: string; code: string; name: string; price: number; category: Category; soldOut?: boolean; mergeQty?: boolean };
type CartItem = { id: string; product: Product; qty: number; summary?: string; note?: string };

type Shortcut = { key: string; label: string; icon: string; badgeLeft?: number; badgeRight?: number; fixed?: boolean };

const categories: Category[] = ['平台餐','輕食','紫米套餐','紫米飯團','肉燥便當','特色便當','芝士薯角餐','小食炸物','飲品','外賣工具','甜品及炸物','咖喱便當'];
const products: Product[] = [
  { id:'p1', code:'F1', name:'招牌雞扒紫米飯團餐', price:51, category:'平台餐' },
  { id:'p2', code:'F2', name:'鹽燒鯖魚紫米飯團餐', price:50, category:'平台餐' },
  { id:'p3', code:'F3', name:'香煎豬扒紫米飯團餐', price:52, category:'平台餐' },
  { id:'p4', code:'F4', name:'韓式燒牛紫米飯團餐', price:53, category:'平台餐' },
  { id:'p5', code:'F5', name:'照燒雞肉紫米飯團餐', price:49, category:'平台餐' },
  { id:'p6', code:'F6', name:'天神炸雞紫米飯團餐', price:50, category:'平台餐' },
  { id:'p7', code:'F7', name:'麻辣雞絲紫米飯團餐', price:50, category:'平台餐' },
  { id:'p8', code:'F8', name:'香煎三文魚紫米飯團餐', price:59, category:'平台餐' },
  { id:'p9', code:'12', name:'肉燥便當', price:50, category:'肉燥便當', mergeQty:false },
  { id:'p10', code:'C12', name:'麻神雞絲便當', price:50, category:'特色便當', mergeQty:false },
  { id:'p11', code:'B3', name:'芝士豬扒便當', price:52, category:'特色便當', mergeQty:false },
  { id:'p12', code:'B4', name:'照燒雞腿便當', price:53, category:'特色便當', mergeQty:false },
  { id:'p13', code:'S1', name:'薯角', price:18, category:'小食炸物', soldOut:true },
];

const defaultShortcuts: Shortcut[] = [
  { key:'hold', label:'掛單/取單', icon:'📋', badgeLeft:3, fixed:true },
  { key:'pending', label:'待補/重組', icon:'🍴', badgeLeft:2, fixed:true },
  { key:'dinein', label:'堂食', icon:'🪑', badgeLeft:5, fixed:true },
  { key:'workbench', label:'工作台', icon:'▦', badgeLeft:3, badgeRight:1, fixed:true },
  { key:'note', label:'整單備註', icon:'📝' },
  { key:'soldout', label:'售罄', icon:'🛍', badgeRight:12 },
  { key:'reprint', label:'重印', icon:'🖨' },
  { key:'more', label:'更多入口', icon:'›' },
];

export default function App() {
  const [activeCategory, setActiveCategory] = useState<Category>('平台餐');
  const [cart, setCart] = useState<CartItem[]>([
    { id:'c1', product:products[0], qty:1, summary:'小食：薯角 · 待選飲品' },
    { id:'c2', product:products[8], qty:1, summary:'飯底：肉燥飯' },
    { id:'c3', product:{ id:'s', code:'S2', name:'紫米沙律', price:43, category:'輕食' }, qty:1, summary:'醬汁：不需要' },
  ]);
  const [shortcuts] = useState(defaultShortcuts);
  const [shortcutPage, setShortcutPage] = useState(0);
  const [detailItem, setDetailItem] = useState<CartItem | null>(null);

  const visibleProducts = useMemo(() => products.filter(p => p.category === activeCategory && !p.soldOut), [activeCategory]);
  const totalQty = cart.reduce((s, i) => s + i.qty, 0);
  const total = cart.reduce((s, i) => s + i.product.price * i.qty, 0);
  const soldOutCount = products.filter(p => p.soldOut).length;

  const addProduct = (product: Product) => {
    if (product.soldOut) return;
    setCart(current => [...current, { id:`c-${Date.now()}`, product, qty:1 }]);
  };
  const changeQty = (id: string, delta: number) => setCart(current => current.map(i => i.id === id ? { ...i, qty:Math.max(1, i.qty + delta) } : i));
  const clearCart = () => setCart([]);

  return (
    <div className="smt-shell">
      <header className="smt-topbar">
        <div className="brand-block"><strong>磨飯</strong><span>MORE<br/>FUN</span><b>SMT</b><em>單號 #0128</em></div>
        <div className="system-icons" aria-label="系統狀態">
          {['⌁','☁','◉','API','▣','♧'].map((icon, index) => <button key={index} className={index === 5 ? 'status-alert' : 'status-ok'}>{icon}{index === 5 && <i>2</i>}</button>)}
        </div>
        <div className="top-actions"><button className="new-order">🔔 新單提醒 <i>5</i></button><button className="more-top">更多 ☰</button></div>
      </header>

      <main className="smt-main">
        <section className="cart-pane">
          <div className="cart-title"><div><span>🛒</span><strong>購物車</strong></div><button onClick={clearCart} title="清空購物車">🗑</button></div>
          <div className="cart-scroll">
            {cart.map(item => <article className="cart-line" key={item.id}>
              <div className="cart-line-head"><strong>{item.product.code} {item.product.name}</strong><b>HK${item.product.price}</b><button onClick={() => setDetailItem(item)}>⋮</button></div>
              {item.summary && <p>{item.summary}</p>}
              <div className="cart-line-bottom">
                {item.product.mergeQty !== false && <div className="qty-control"><button onClick={() => changeQty(item.id,-1)}>−</button><span>{item.qty}</span><button onClick={() => changeQty(item.id,1)}>＋</button></div>}
              </div>
            </article>)}
          </div>
          <div className="checkout-strip"><span>🛒 共 {totalQty} 件</span><strong>HK${total}</strong><button>收款</button></div>
        </section>

        <section className="product-pane">
          <div className="category-grid">
            {categories.map(category => <button key={category} className={activeCategory === category ? 'active' : ''} onClick={() => setActiveCategory(category)}>{category}</button>)}
          </div>
          <div className="product-grid">
            {visibleProducts.map(product => <article className="product-card" key={product.id}>
              <button className="product-hit" onClick={() => addProduct(product)}>
                <div className="food-placeholder">{product.code}</div>
                <strong>{product.name}</strong><b>HK${product.price}</b>
              </button>
              <button className="product-more" onClick={() => setDetailItem({ id:`draft-${product.id}`, product, qty:1 })}>⋮</button>
            </article>)}
            {visibleProducts.length === 0 && <div className="empty-products">此分類暫未加入示範商品</div>}
          </div>
        </section>
      </main>

      <nav className="shortcut-bar">
        <button className="shortcut-arrow" onClick={() => setShortcutPage(Math.max(0, shortcutPage-1))}>‹</button>
        <div className="shortcut-grid">
          {shortcuts.slice(shortcutPage*8, shortcutPage*8+8).map(shortcut => <button key={shortcut.key} className={shortcut.fixed ? 'fixed-shortcut' : ''}>
            {shortcut.badgeLeft !== undefined && <i className="badge-left">{shortcut.badgeLeft}</i>}
            {shortcut.badgeRight !== undefined && <i className="badge-right">{shortcut.key === 'soldout' ? Math.max(shortcut.badgeRight, soldOutCount) : shortcut.badgeRight}</i>}
            <span>{shortcut.icon}</span><strong>{shortcut.label}</strong>
          </button>)}
        </div>
        <button className="shortcut-arrow" onClick={() => setShortcutPage(shortcutPage+1)}>›</button>
      </nav>

      {detailItem && <div className="detail-overlay"><section className="detail-card"><header><div><small>商品詳情</small><h2>{detailItem.product.code} {detailItem.product.name}</h2></div><button onClick={() => setDetailItem(null)}>×</button></header><div className="detail-body"><p>UI-02A 已鎖定；正式內容會按後台商品類型與選項群組載入。</p><button>調整</button><button>備註</button></div><footer><strong>HK${detailItem.product.price * detailItem.qty}</strong><button onClick={() => setDetailItem(null)}>完成</button></footer></section></div>}
    </div>
  );
}
