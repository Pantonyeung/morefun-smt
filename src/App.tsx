import { useMemo, useState } from 'react';

type ProductType = '飯團' | '便當' | '沙律' | '小食' | '飲品';
type QuickTag = '全部' | '雞' | '豬' | '魚' | '芝士' | '辣' | '素' | '售罄';
type ChoiceRole = 'riceBall' | 'snack' | 'drink';
type DetailSection = ChoiceRole | 'adjust' | 'note';
type RiceBase = 'braised' | 'curry' | 'vegetable';

type Product = {
  id: string;
  code: string;
  baseCode?: string;
  name: string;
  type: ProductType;
  price: number;
  tags: QuickTag[];
  soldOut?: boolean;
  mergeQty?: boolean;
};

type CartItem = {
  id: string;
  product: Product;
  qty: number;
  riceBall?: Product;
  snack?: Product;
  drink?: Product;
  riceBase?: RiceBase;
  adjustments?: string[];
  note?: string;
};

type DetailDraft = CartItem & { source: 'cart' | 'product' | 'combine' };

const products: Product[] = [
  { id: 'f1', code: 'F1', name: '招牌雞扒飯團', type: '飯團', price: 41, tags: ['雞'], mergeQty: true },
  { id: 'f2', code: 'F2', name: '黑椒脆豬飯團', type: '飯團', price: 43, tags: ['豬'], mergeQty: true },
  { id: 'f3', code: 'F3', name: '天神炸雞飯團', type: '飯團', price: 45, tags: ['雞', '辣'], soldOut: true },
  { id: 'f4', code: 'F4', name: '鮭魚飯團', type: '飯團', price: 45, tags: ['魚'], mergeQty: true },
  { id: 'f5', code: 'F5', name: '芝士雞絲飯團', type: '飯團', price: 47, tags: ['雞', '芝士'], mergeQty: true },
  { id: 'f6', code: 'F6', name: '泡菜豬肉飯團', type: '飯團', price: 47, tags: ['豬', '辣'], soldOut: true },
  { id: 'b12', code: '12', baseCode: '12', name: '古早鹽酥雞肉燥飯', type: '便當', price: 52, tags: ['雞'], mergeQty: false },
  { id: 'salad1', code: 'S1', name: '紫米能量沙律', type: '沙律', price: 48, tags: ['素'], mergeQty: false },
  { id: 's1', code: 'S01', name: '薯角', type: '小食', price: 18, tags: ['素'], mergeQty: true },
  { id: 's2', code: 'S02', name: '天神炸雞', type: '小食', price: 24, tags: ['雞', '辣'], mergeQty: true },
  { id: 's3', code: 'S03', name: '雞翼', type: '小食', price: 22, tags: ['雞'], soldOut: true },
  { id: 'd1', code: 'D01', name: '台式奶茶', type: '飲品', price: 8, tags: [], mergeQty: true },
  { id: 'd2', code: 'D02', name: '手打檸檬茶', type: '飲品', price: 10, tags: [], mergeQty: true },
  { id: 'd3', code: 'D03', name: '凍檸檬水', type: '飲品', price: 6, tags: [], soldOut: true },
];

const categories: ProductType[] = ['飯團', '便當', '沙律', '小食', '飲品'];
const quickTags: QuickTag[] = ['全部', '雞', '豬', '魚', '芝士', '辣', '素', '售罄'];
const roleLabel: Record<ChoiceRole, string> = { riceBall: '飯團', snack: '小食', drink: '飲品' };

const riceBaseMeta: Record<RiceBase, { label: string; prefix: string }> = {
  braised: { label: '肉燥飯', prefix: '' },
  curry: { label: '咖喱飯', prefix: 'C' },
  vegetable: { label: '菜飯', prefix: 'V' },
};

function bentoIdentity(item: CartItem) {
  if (item.product.type !== '便當') return { code: item.product.code, name: item.product.name };
  const base = item.riceBase ?? 'braised';
  const baseCode = item.product.baseCode ?? item.product.code.replace(/^[CV]/, '');
  return {
    code: `${riceBaseMeta[base].prefix}${baseCode}`,
    name: `古早鹽酥雞${riceBaseMeta[base].label}`,
  };
}

function linePrice(item: CartItem) {
  const base = item.riceBall?.price ?? item.product.price;
  const drink = item.drink?.price ?? 0;
  const snack = item.snack?.price ?? 0;
  const adjustment = item.adjustments?.includes('雙倍醬 +$2') ? 2 : 0;
  return (base + drink + snack + adjustment) * item.qty;
}

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
      adjustments: [],
      note: '',
    },
  ]);
  const [editingId, setEditingId] = useState<string | null>('cart-1');
  const [choiceRole, setChoiceRole] = useState<ChoiceRole | null>(null);
  const [localTag, setLocalTag] = useState<QuickTag>('全部');
  const [detail, setDetail] = useState<DetailDraft | null>(null);
  const [detailSection, setDetailSection] = useState<DetailSection>('riceBall');
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);

  const visibleProducts = useMemo(() => {
    if (globalTag === '售罄') return products.filter((product) => product.soldOut);
    if (globalTag !== '全部') return products.filter((product) => !product.soldOut && product.tags.includes(globalTag));
    return products.filter((product) => !product.soldOut && product.type === category);
  }, [category, globalTag]);

  const soldOutCount = products.filter((product) => product.soldOut).length;
  const editingItem = cart.find((item) => item.id === editingId) ?? null;
  const candidateType: ProductType | null =
    choiceRole === 'riceBall' ? '飯團' : choiceRole === 'snack' ? '小食' : choiceRole === 'drink' ? '飲品' : null;

  const candidates = useMemo(() => {
    if (!candidateType) return [];
    if (localTag === '售罄') return products.filter((product) => product.type === candidateType && product.soldOut);
    return products.filter((product) => {
      const isInCurrentPool = product.type === candidateType;
      const matchesTag = localTag === '全部' || product.tags.includes(localTag);
      return isInCurrentPool && !product.soldOut && matchesTag;
    });
  }, [candidateType, localTag]);

  const detailCandidates = useMemo(() => {
    if (!detail) return [];
    const type: ProductType | null = detailSection === 'riceBall' ? '飯團' : detailSection === 'snack' ? '小食' : detailSection === 'drink' ? '飲品' : null;
    if (!type) return [];
    if (localTag === '售罄') return products.filter((product) => product.type === type && product.soldOut);
    return products.filter((product) => product.type === type && !product.soldOut && (localTag === '全部' || product.tags.includes(localTag)));
  }, [detail, detailSection, localTag]);

  const addProduct = (product: Product) => {
    if (product.soldOut) return;
    setCart((current) => [...current, { id: `cart-${Date.now()}`, product, qty: 1, riceBase: product.type === '便當' ? 'braised' : undefined, adjustments: [], note: '' }]);
  };

  const updateQty = (id: string, delta: number) => {
    setCart((current) => current
      .map((item) => item.id === id ? { ...item, qty: Math.max(0, item.qty + delta) } : item)
      .filter((item) => item.qty > 0));
  };

  const chooseCandidate = (product: Product) => {
    if (!editingId || !choiceRole || product.soldOut) return;
    setCart((current) => current.map((item) => item.id === editingId ? { ...item, [choiceRole]: product } : item));
    setChoiceRole(null);
    setLocalTag('全部');
  };

  const openDetailFromCart = (item: CartItem, source: DetailDraft['source'] = 'cart') => {
    setDetail({ ...structuredClone(item), source });
    setDetailSection(item.product.type === '便當' ? 'adjust' : 'riceBall');
    setLocalTag('全部');
    setAdjustOpen(false);
    setNoteOpen(false);
  };

  const openDetailFromProduct = (product: Product) => {
    if (product.soldOut) return;
    const draft: DetailDraft = {
      id: `draft-${Date.now()}`,
      product,
      qty: 1,
      source: 'product',
      riceBall: product.type === '飯團' ? product : undefined,
      riceBase: product.type === '便當' ? 'braised' : undefined,
      adjustments: [],
      note: '',
    };
    setDetail(draft);
    setDetailSection(product.type === '便當' ? 'adjust' : 'riceBall');
    setLocalTag('全部');
  };

  const saveDetail = () => {
    if (!detail) return;
    const clean = { ...detail };
    delete (clean as Partial<DetailDraft>).source;
    if (detail.source === 'product') {
      setCart((current) => [...current, clean]);
    } else {
      setCart((current) => current.map((item) => item.id === detail.id ? clean : item));
    }
    setDetail(null);
    setEditingId(null);
  };

  const setDetailChoice = (product: Product) => {
    if (!detail || product.soldOut || !['riceBall', 'snack', 'drink'].includes(detailSection)) return;
    setDetail({ ...detail, [detailSection]: product });
    if (detailSection === 'riceBall') setDetailSection('snack');
    else if (detailSection === 'snack') setDetailSection('drink');
  };

  const toggleAdjustment = (value: string) => {
    if (!detail) return;
    const current = detail.adjustments ?? [];
    setDetail({ ...detail, adjustments: current.includes(value) ? current.filter((item) => item !== value) : [...current, value] });
  };

  const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);
  const total = cart.reduce((sum, item) => sum + linePrice(item), 0);

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
            {cart.map((item, index) => {
              const identity = bentoIdentity(item);
              return (
                <article className={`cart-item ${editingId === item.id ? 'editing' : ''}`} key={item.id}>
                  <div className="cart-item-head">
                    <div><small>商品 {index + 1}</small><h3>{identity.code} {identity.name}</h3></div>
                    <button className="more-button" onClick={() => { setEditingId(item.id); setChoiceRole(null); }}>⋯<span>修改</span></button>
                  </div>
                  <div className="selection-summary">
                    {item.riceBall && <span>飯團：{item.riceBall.name}</span>}
                    {item.snack && <span>小食：{item.snack.name}</span>}
                    {item.drink && <span>飲品：{item.drink.name}</span>}
                    {item.adjustments?.map((value) => <span key={value}>{value}</span>)}
                    {item.note && <span>備註：{item.note}</span>}
                  </div>
                  <div className="qty-row">
                    {item.product.mergeQty !== false && <><button onClick={() => updateQty(item.id, -1)}>−</button><strong>{item.qty}</strong><button onClick={() => updateQty(item.id, 1)}>＋</button></>}
                    <button className="combine-button" onClick={() => openDetailFromCart(item, 'combine')}>組合</button>
                    <b>${linePrice(item)}</b>
                  </div>
                </article>
              );
            })}
          </div>
          <div className="cart-actions"><button>掛單／取單</button><button>整單備註</button></div>
          <div className="checkout-bar"><span>{totalQty} 件</span><strong>${total}</strong><button>收款</button></div>
        </section>

        <section className="product-panel">
          <div className="category-row">
            {categories.map((item) => <button key={item} className={category === item && globalTag === '全部' ? 'active' : ''} onClick={() => { setCategory(item); setGlobalTag('全部'); }}>{item}</button>)}
          </div>
          <div className="quick-find" aria-label="全店快找">
            <span>全店快找</span>
            {quickTags.map((tag) => <button key={tag} className={globalTag === tag ? 'active' : ''} onClick={() => setGlobalTag(tag)}>{tag}{tag === '售罄' && soldOutCount > 0 ? <i>{soldOutCount}</i> : null}</button>)}
          </div>
          <div className="product-grid">
            {visibleProducts.map((product) => (
              <div className={`product-card ${product.soldOut ? 'sold-out' : ''}`} key={product.id}>
                <button className="product-main" onClick={() => addProduct(product)} disabled={product.soldOut}>
                  <span className="product-code">{product.code}</span><small className="product-type">{product.type}</small>
                  <strong>{product.name}</strong><b>${product.price}</b><small>{product.soldOut ? '售罄' : '按一下直接加入'}</small>
                </button>
                {!product.soldOut && <button className="product-detail-button" onClick={() => openDetailFromProduct(product)}>完整詳情</button>}
              </div>
            ))}
          </div>
        </section>

        {editingItem && !detail && (
          <aside className="edit-drawer">
            {choiceRole === null ? (
              <>
                <div className="drawer-head"><div><small>快速修改｜商品</small><h2>{bentoIdentity(editingItem).code} {bentoIdentity(editingItem).name}</h2></div><button onClick={() => setEditingId(null)}>×</button></div>
                <button className="edit-row" onClick={() => setChoiceRole('riceBall')}><span>飯團</span><strong>{editingItem.riceBall?.name ?? ''}</strong><b>›</b></button>
                <button className="edit-row" onClick={() => setChoiceRole('snack')}><span>小食</span><strong>{editingItem.snack?.name ?? ''}</strong><b>›</b></button>
                <button className="edit-row" onClick={() => setChoiceRole('drink')}><span>飲品</span><strong>{editingItem.drink?.name ?? ''}</strong><b>›</b></button>
                {editingItem.product.mergeQty !== false && <div className="drawer-qty"><span>數量</span><button onClick={() => updateQty(editingItem.id, -1)}>−</button><strong>{editingItem.qty}</strong><button onClick={() => updateQty(editingItem.id, 1)}>＋</button></div>}
                <button className="edit-row"><span>備註</span><strong>{editingItem.note ?? ''}</strong><b>›</b></button>
                <button className="detail-link" onClick={() => openDetailFromCart(editingItem)}>查看完整詳情 ›</button>
                <button className="complete-button" onClick={() => setEditingId(null)}>完成</button>
              </>
            ) : (
              <>
                <div className="drawer-head"><div><small>類內快找</small><h2>{candidateType}選擇</h2></div><button onClick={() => { setChoiceRole(null); setLocalTag('全部'); }}>‹</button></div>
                <div className="local-tags">
                  {quickTags.map((tag) => <button key={tag} className={localTag === tag ? 'active' : ''} onClick={() => setLocalTag(tag)}>{tag}{tag === '售罄' ? <i>{products.filter((p) => p.type === candidateType && p.soldOut).length}</i> : null}</button>)}
                </div>
                <div className="candidate-grid">
                  {candidates.length > 0 ? candidates.map((product) => (
                    <button key={product.id} disabled={product.soldOut} className={product.soldOut ? 'sold-out' : ''} onClick={() => chooseCandidate(product)}><small>{product.code}</small><strong>{product.name}</strong><b>{product.soldOut ? '售罄' : `$${product.price}`}</b></button>
                  )) : <div className="empty-state">沒有符合條件的項目<button onClick={() => setLocalTag('全部')}>查看全部{candidateType}</button></div>}
                </div>
              </>
            )}
          </aside>
        )}

        {detail && (
          <section className="detail-workspace">
            <div className="detail-topline">
              <button onClick={() => setDetail(null)}>‹ 返回</button>
              <div><small>商品完整詳情</small><h2>{bentoIdentity(detail).code} {bentoIdentity(detail).name}</h2></div>
              <span>UI-02A LOCK</span>
            </div>

            <div className="detail-layout">
              <aside className="detail-product-info">
                <div className="product-visual">{detail.product.code}</div>
                <h3>{bentoIdentity(detail).name}</h3>
                <strong>${detail.product.price}</strong>
                <p>{detail.product.type === '飯團' ? '可加優惠飲品，亦可再加小食組成完整飯團餐。' : '按需要調整商品內容。'}</p>
                {detail.product.type === '便當' && (
                  <div className="rice-base-group">
                    {(Object.keys(riceBaseMeta) as RiceBase[]).map((base) => (
                      <button key={base} className={detail.riceBase === base ? 'active' : ''} onClick={() => setDetail({ ...detail, riceBase: base })}>{riceBaseMeta[base].label}</button>
                    ))}
                  </div>
                )}
              </aside>

              <section className="detail-choice-area">
                {detail.product.type !== '便當' && (
                  <div className="detail-section-tabs">
                    {(['riceBall', 'snack', 'drink'] as ChoiceRole[]).map((role) => (
                      <button key={role} className={detailSection === role ? 'active' : ''} onClick={() => { setDetailSection(role); setLocalTag('全部'); }}>{roleLabel[role]}<small>{detail[role] ? '1/1' : '0/1'}</small></button>
                    ))}
                  </div>
                )}
                <div className="local-tags detail-tags">
                  {quickTags.map((tag) => <button key={tag} className={localTag === tag ? 'active' : ''} onClick={() => setLocalTag(tag)}>{tag}{tag === '售罄' ? <i>{products.filter((p) => p.type === (detailSection === 'riceBall' ? '飯團' : detailSection === 'snack' ? '小食' : '飲品') && p.soldOut).length}</i> : null}</button>)}
                </div>
                {detail.product.type === '便當' ? (
                  <div className="bento-adjustment-panel">
                    <h3>便當調整</h3>
                    <button className="collapsed-row" onClick={() => setAdjustOpen(!adjustOpen)}>飯量／配料調整 <b>›</b></button>
                    {adjustOpen && <div className="adjust-popover">
                      {['少飯', '半飯', '多飯', '走蛋'].filter((value) => !(detail.riceBase === 'curry' && value === '走蛋')).map((value) => <button key={value} className={detail.adjustments?.includes(value) ? 'active' : ''} onClick={() => toggleAdjustment(value)}>{value}</button>)}
                      <button className="done-mini" onClick={() => setAdjustOpen(false)}>完成</button>
                    </div>}
                  </div>
                ) : (
                  <div className="detail-product-grid">
                    {detailCandidates.map((product) => <button key={product.id} disabled={product.soldOut} className={`${product.soldOut ? 'sold-out' : ''} ${detail[detailSection as ChoiceRole]?.id === product.id ? 'selected' : ''}`} onClick={() => setDetailChoice(product)}><small>{product.code}</small><strong>{product.name}</strong><b>{product.soldOut ? '售罄' : `$${product.price}`}</b></button>)}
                  </div>
                )}
              </section>

              <aside className="detail-summary">
                <h3>目前選擇</h3>
                {detail.riceBall && <button onClick={() => setDetailSection('riceBall')}><span>飯團</span><strong>{detail.riceBall.name}</strong></button>}
                {detail.snack && <button onClick={() => setDetailSection('snack')}><span>小食</span><strong>{detail.snack.name}</strong></button>}
                {detail.drink && <button onClick={() => setDetailSection('drink')}><span>飲品</span><strong>{detail.drink.name}</strong></button>}
                {!detail.snack && detail.riceBall && <button className="suggestion" onClick={() => setDetailSection('snack')}>＋ 加小食更優惠</button>}
                {!detail.drink && detail.riceBall && <button className="suggestion" onClick={() => setDetailSection('drink')}>＋ 加優惠飲品</button>}

                <button className="collapsed-row" onClick={() => setAdjustOpen(!adjustOpen)}>調整 <b>›</b></button>
                {adjustOpen && detail.product.type !== '便當' && <div className="adjust-popover summary-popover">
                  {['少醬', '走配料', '少冰', '半糖', '雙倍醬 +$2'].map((value) => <button key={value} className={detail.adjustments?.includes(value) ? 'active' : ''} onClick={() => toggleAdjustment(value)}>{value}</button>)}
                  <button className="done-mini" onClick={() => setAdjustOpen(false)}>完成</button>
                </div>}
                {detail.adjustments?.length ? <div className="result-chips">{detail.adjustments.map((value) => <span key={value}>{value}</span>)}</div> : null}

                <button className="collapsed-row" onClick={() => setNoteOpen(!noteOpen)}>備註 <b>›</b></button>
                {noteOpen && <div className="note-editor"><textarea value={detail.note ?? ''} onChange={(event) => setDetail({ ...detail, note: event.target.value })} placeholder="輸入商品備註"/><button onClick={() => setNoteOpen(false)}>完成</button></div>}
                {detail.note && <p className="note-result">{detail.note}</p>}

                {detail.product.mergeQty !== false && <div className="detail-qty"><span>數量</span><button onClick={() => setDetail({ ...detail, qty: Math.max(1, detail.qty - 1) })}>−</button><strong>{detail.qty}</strong><button onClick={() => setDetail({ ...detail, qty: detail.qty + 1 })}>＋</button></div>}
                <div className="price-summary"><span>商品合計</span><strong>${linePrice(detail)}</strong></div>
                <button className="complete-button detail-complete" onClick={saveDetail}>完成　${linePrice(detail)}</button>
              </aside>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
