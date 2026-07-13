import { useEffect, useMemo, useState } from 'react';

type ViewKey = 'order' | 'hold' | 'pending' | 'dinein' | 'workbench' | 'note' | 'soldout' | 'reprint' | 'lookup' | 'more';
type ModalKey = 'note' | 'status' | 'newOrders' | 'quickEdit' | 'detail' | 'settings' | null;
type Category = '平台餐' | '輕食' | '紫米套餐' | '紫米飯團' | '肉燥便當' | '特色便當' | '芝士薯角餐' | '小食炸物' | '飲品' | '外賣工具' | '甜品及炸物' | '咖喱便當';
type Product = { id:string; code:string; name:string; price:number; category:Category; soldOut?:boolean; mergeQty?:boolean; summary?:string };
type CartItem = { id:string; product:Product; qty:number; summary?:string; note?:string };
type Shortcut = { key:ViewKey; label:string; icon:string; badgeLeft?:number; badgeRight?:number; fixed?:boolean };
type HoldOrder = { id:string; title:string; meta:string; amount:number; items:CartItem[] };
type PendingOrder = { id:string; title:string; missing:string; count:number };
type TableOrder = { id:string; table:string; total:number; paid:number; items:CartItem[] };
type WorkStatus = 'new' | 'open' | 'completed' | 'abnormal';
type WorkOrder = { id:string; source:string; amount:number; status:WorkStatus; acceptedAt?:number; issue?:string };

const AUTO_COMPLETE_MINUTES = 30;
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
  { id:'p9', code:'12', name:'古早鹽酥雞肉燥飯', price:52, category:'肉燥便當', mergeQty:false, summary:'飯底：肉燥飯' },
  { id:'p10', code:'C12', name:'古早鹽酥雞咖喱飯', price:52, category:'咖喱便當', mergeQty:false, summary:'飯底：咖喱飯' },
  { id:'p11', code:'V12', name:'古早鹽酥雞菜飯', price:52, category:'特色便當', mergeQty:false, summary:'飯底：菜飯' },
  { id:'p12', code:'S1', name:'紫米能量沙律', price:48, category:'輕食', summary:'醬汁：不需要' },
  { id:'p13', code:'S01', name:'薯角', price:18, category:'小食炸物', soldOut:true },
  { id:'p14', code:'D01', name:'台式奶茶', price:18, category:'飲品' },
  { id:'p15', code:'D02', name:'凍檸檬茶', price:20, category:'飲品' },
];

const shortcuts: Shortcut[] = [
  { key:'order', label:'點單', icon:'⌂', fixed:true },
  { key:'hold', label:'掛單', icon:'▤', badgeLeft:3, fixed:true },
  { key:'pending', label:'待補', icon:'♨', badgeLeft:4, fixed:true },
  { key:'dinein', label:'堂食', icon:'♧', badgeLeft:2, fixed:true },
  { key:'workbench', label:'工作台', icon:'▦', badgeLeft:3, badgeRight:1, fixed:true },
  { key:'note', label:'備註', icon:'▧' },
  { key:'soldout', label:'售罄', icon:'▱', badgeRight:1 },
  { key:'reprint', label:'重印', icon:'▣' },
  { key:'lookup', label:'查單', icon:'⌕' },
  { key:'more', label:'更多', icon:'•••' },
];

const makeItem = (product:Product, id:string, qty=1, summary=product.summary):CartItem => ({ id, product, qty, summary });
const initialWorkOrders: WorkOrder[] = [
  { id:'#W-1051', source:'網站', amount:128, status:'new' },
  { id:'#A-2206', source:'App', amount:89, status:'open', acceptedAt:Date.now()-9*60_000 },
  { id:'#FP-773', source:'Foodpanda', amount:214, status:'open', acceptedAt:Date.now()-26*60_000 },
  { id:'#T-019', source:'電話', amount:67, status:'abnormal', acceptedAt:Date.now()-38*60_000, issue:'付款資料不完整' },
];

export default function App() {
  const [view, setView] = useState<ViewKey>('order');
  const [modal, setModal] = useState<ModalKey>(null);
  const [activeCategory, setActiveCategory] = useState<Category>('平台餐');
  const [quickTag, setQuickTag] = useState('全部');
  const [cart, setCart] = useState<CartItem[]>([
    makeItem(products[0],'c1',1,'小食：薯角 · 待選飲品'),
    makeItem(products[8],'c2',1,'飯底：肉燥飯'),
    makeItem(products[11],'c3',1,'醬汁：不需要'),
  ]);
  const [activeItem, setActiveItem] = useState<CartItem | null>(null);
  const [orderNote, setOrderNote] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [newOrderCount, setNewOrderCount] = useState(5);
  const [holds, setHolds] = useState<HoldOrder[]>([
    { id:'h1', title:'SMT 暫存01', meta:'4件 · 3分鐘前', amount:168, items:[makeItem(products[0],'h1a'),makeItem(products[13],'h1b')] },
    { id:'h2', title:'SMM 暫存02', meta:'2件 · 8分鐘前', amount:93, items:[makeItem(products[1],'h2a')] },
    { id:'h3', title:'SMT 暫存03', meta:'6件 · 12分鐘前', amount:252, items:[makeItem(products[3],'h3a',2)] },
  ]);
  const [pending, setPending] = useState<PendingOrder[]>([
    { id:'#0127', title:'F4 飯團餐', missing:'飲品', count:2 },
    { id:'#0125', title:'C12 咖喱飯', missing:'替代飯底', count:1 },
    { id:'#0122', title:'紫米沙律', missing:'醬汁', count:1 },
  ]);
  const [tableOrders, setTableOrders] = useState<TableOrder[]>([
    { id:'t2', table:'2號枱', total:186, paid:68, items:[makeItem(products[0],'t2a',2),makeItem(products[13],'t2b'),makeItem(products[8],'t2c')] },
    { id:'t6', table:'6號枱', total:72, paid:72, items:[makeItem(products[11],'t6a')] },
  ]);
  const [selectedTable, setSelectedTable] = useState<TableOrder | null>(null);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>(initialWorkOrders);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const limit = AUTO_COMPLETE_MINUTES * 60_000;
    setWorkOrders(current => current.map(order => {
      if (order.status !== 'open' || !order.acceptedAt) return order;
      return now - order.acceptedAt >= limit ? { ...order, status:'completed' } : order;
    }));
  }, [now]);

  const visibleProducts = useMemo(() => {
    const tagFiltered = quickTag === '全部' ? products : products.filter(p => `${p.code}${p.name}${p.category}`.includes(quickTag));
    return tagFiltered.filter(p => p.category === activeCategory && !p.soldOut);
  }, [activeCategory, quickTag]);
  const soldOutCount = products.filter(p => p.soldOut).length;
  const totalQty = cart.reduce((sum,item) => sum + item.qty, 0);
  const total = cart.reduce((sum,item) => sum + item.product.price * item.qty, 0);
  const networkCount = workOrders.filter(order => order.status === 'new').length;
  const abnormalCount = workOrders.filter(order => order.status === 'abnormal').length;
  const activeWorkCount = workOrders.filter(order => order.status === 'open').length;

  const go = (next:ViewKey) => {
    if (next === 'note') { setModal('note'); return; }
    setView(next); setModal(null); setStatusMessage('');
  };
  const addProduct = (product:Product) => { if (!product.soldOut) setCart(current => [...current, makeItem(product,`c-${Date.now()}`)]); };
  const updateQty = (id:string, delta:number) => setCart(current => current.map(item => item.id === id ? { ...item, qty:Math.max(1,item.qty + delta) } : item));
  const openQuickEdit = (item:CartItem) => { setActiveItem(item); setModal('quickEdit'); };
  const openDetail = (item:CartItem) => { setActiveItem(item); setModal('detail'); };
  const saveItem = (next:CartItem) => { setCart(current => current.map(item => item.id === next.id ? next : item)); setActiveItem(next); };
  const restoreHold = (hold:HoldOrder) => { setCart(hold.items.map(i => ({...i,id:`restored-${Date.now()}-${i.id}`}))); setHolds(current => current.filter(h => h.id !== hold.id)); go('order'); };
  const fillAllPending = (missing:string) => setPending(current => current.filter(item => item.missing !== missing));
  const splitOne = (order:TableOrder) => { const unpaid = Math.max(0, order.total-order.paid); if (!unpaid) return; const updated = {...order,paid:order.paid+Math.min(38,unpaid)}; setTableOrders(current => current.map(t => t.id===order.id?updated:t)); setSelectedTable(updated); };
  const addToTable = (order:TableOrder) => { const updated = {...order,total:order.total+18,items:[...order.items,makeItem(products[13],`${order.id}-${Date.now()}`)]}; setTableOrders(current => current.map(t => t.id===order.id?updated:t)); setSelectedTable(updated); };

  const acceptOrder = (id:string) => {
    setWorkOrders(current => current.map(order => order.id === id ? { ...order, status:'open', acceptedAt:Date.now() } : order));
    setNewOrderCount(current => Math.max(0,current-1));
  };

  return <div className="smt-shell">
    <header className="smt-topbar">
      <div className="brand"><strong>磨飯</strong><span>MORE<br/>FUN</span><b>SMT</b><em>單號 #0128</em></div>
      <div className="health-icons">{[['Wi‑Fi','⌁',false],['雲端','☁',false],['裝置','◉',false],['API','API',false],['打印','▣',false],['同步','♧',true]].map(([label,icon,alert])=><button key={String(label)} className={`health ${alert?'alert':'ok'}`} title={String(label)} onClick={()=>{setStatusMessage(`${label}：${alert?'有 2 項待處理':'正常'}`);setModal('status')}}><span>{icon}</span>{alert?<i>2</i>:null}</button>)}</div>
      <div className="top-actions"><button className="new-order" onClick={()=>setModal('newOrders')}>🔔 新單 <i>{newOrderCount}</i></button><button onClick={()=>setModal('settings')}>更多 ☰</button></div>
    </header>

    <main className="app-stage">
      {view === 'order' ? <div className="order-layout">
        <section className="cart-pane">
          <div className="cart-head"><div><span>🛒</span><strong>購物車</strong></div><button onClick={()=>setCart([])} title="清空購物車">🗑</button></div>
          <div className="cart-scroll">{cart.map(item => <article className="cart-line" key={item.id}>
            <div className="cart-line-head"><strong>{item.product.code} {item.product.name}</strong><b>HK${item.product.price * item.qty}</b><button onClick={()=>openQuickEdit(item)}>⋮</button></div>
            {item.summary?<p>{item.summary}</p>:null}{item.note?<p>備註：{item.note}</p>:null}
            <div className="cart-line-actions">{item.product.mergeQty!==false?<div className="qty"><button onClick={()=>updateQty(item.id,-1)}>−</button><span>{item.qty}</span><button onClick={()=>updateQty(item.id,1)}>＋</button></div>:null}<button className="text-action" onClick={()=>openDetail(item)}>完整詳情</button></div>
          </article>)}</div>
          <div className="checkout-strip"><span>共 {totalQty} 件</span><strong>HK${total}</strong><button>收款</button></div>
        </section>
        <section className="product-pane">
          <div className="category-grid">{categories.map(c=><button key={c} className={c===activeCategory?'active':''} onClick={()=>setActiveCategory(c)}>{c}</button>)}</div>
          <div className="quick-tags">{['全部','雞','豬','魚','辣','素'].map(tag=><button key={tag} className={tag===quickTag?'active':''} onClick={()=>setQuickTag(tag)}>{tag}</button>)}</div>
          <div className="product-grid">{visibleProducts.map(p=><article className="product-card" key={p.id}><button className="product-hit" onClick={()=>addProduct(p)}><div className="food-art">{p.code}</div><strong>{p.name}</strong><b>HK${p.price}</b></button><button className="product-more" onClick={()=>openDetail(makeItem(p,`draft-${p.id}`))}>⋮</button></article>)}{visibleProducts.length===0?<div className="empty-state">此分類暫未加入示範商品</div>:null}</div>
        </section>
      </div> : <OperationalView view={view} holds={holds} pending={pending} tableOrders={tableOrders} selectedTable={selectedTable} setSelectedTable={setSelectedTable} restoreHold={restoreHold} fillAllPending={fillAllPending} splitOne={splitOne} addToTable={addToTable} go={go} soldOutCount={soldOutCount} workOrders={workOrders} now={now} acceptOrder={acceptOrder} />}
    </main>

    <nav className="shortcut-bar"><div className="shortcut-grid">{shortcuts.map(s=><button key={s.key} className={`${s.fixed?'fixed ':''}${view===s.key?'active':''}`} onClick={()=>go(s.key)}>{s.badgeLeft!==undefined?<i className="badge badge-left">{s.key==='workbench'?networkCount:s.badgeLeft}</i>:null}{s.badgeRight!==undefined?<i className="badge badge-right">{s.key==='workbench'?abnormalCount:s.key==='soldout'?Math.max(s.badgeRight,soldOutCount):s.badgeRight}</i>:null}<span>{s.icon}</span><strong>{s.label}</strong></button>)}</div></nav>

    {modal==='note'?<Modal title="整單備註" onClose={()=>setModal(null)}><textarea className="modal-textarea" value={orderNote} onChange={e=>setOrderNote(e.target.value)} placeholder="輸入整張訂單備註"/><div className="quick-notes">{['全部醬汁另上','客人趕時間','分開包裝','到店致電'].map(n=><button key={n} onClick={()=>setOrderNote(v=>v?`${v} · ${n}`:n)}>{n}</button>)}</div><button className="primary" onClick={()=>setModal(null)}>完成</button></Modal>:null}
    {modal==='status'?<Modal title="系統狀態" onClose={()=>setModal(null)}><div className="status-detail"><strong>{statusMessage}</strong><p>按入狀態圖標後可查看相應裝置、打印或同步項目。</p><button className="primary" onClick={()=>setModal(null)}>知道</button></div></Modal>:null}
    {modal==='newOrders'?<Modal title="新網絡訂單" onClose={()=>setModal(null)}><div className="list-grid">{workOrders.filter(order=>order.status==='new').map(order=><article className="list-card" key={order.id}><div><strong>{order.source} {order.id}</strong><p>待接收 · HK${order.amount}</p></div><button onClick={()=>{acceptOrder(order.id);setModal(null);setView('workbench')}}>接單</button></article>)}</div></Modal>:null}
    {modal==='settings'?<Modal title="更多／設定" onClose={()=>setModal(null)}><div className="settings-grid">{['快捷入口排序','分類每行數量','商品卡每行數量','自動完成時間：30分鐘','打印數量模式','飯底預設次序','裝置狀態','登入／權限'].map(item=><button key={item} onClick={()=>setStatusMessage(`${item} 已選取`)}>{item}<span>›</span></button>)}</div>{statusMessage?<p className="setting-result">{statusMessage}</p>:null}</Modal>:null}
    {modal==='quickEdit'&&activeItem?<CompactQuickEdit item={activeItem} onClose={()=>setModal(null)} onDetail={()=>setModal('detail')} onNote={(note)=>{saveItem({...activeItem,note});setModal(null)}} />:null}
    {modal==='detail'&&activeItem?<DetailModal item={activeItem} onClose={()=>setModal(null)} onSave={saveItem} />:null}
    {view==='order'?<button className="floating-note" onClick={()=>setModal('note')}>整單備註</button>:null}
  </div>;
}

function CompactQuickEdit({item,onClose,onDetail,onNote}:{item:CartItem;onClose:()=>void;onDetail:()=>void;onNote:(note:string)=>void}) {
  const [note,setNote]=useState(item.note??'');
  return <div className="quick-overlay" onClick={onClose}><section className="quick-card" onClick={event=>event.stopPropagation()}><header><div><small>快速修改</small><h3>{item.product.code} {item.product.name}</h3></div><button onClick={onClose}>×</button></header><div className="quick-rows"><button>主食／飯團 <span>›</span></button><button>小食 <span>›</span></button><button>飲品 <span>›</span></button><label><span>備註</span><input value={note} onChange={event=>setNote(event.target.value)} placeholder="直接輸入"/></label></div><footer><button className="detail-link" onClick={onDetail}>完整詳情</button><button className="primary" onClick={()=>onNote(note)}>完成</button></footer></section></div>;
}

function OperationalView({view,holds,pending,tableOrders,selectedTable,setSelectedTable,restoreHold,fillAllPending,splitOne,addToTable,go,soldOutCount,workOrders,now,acceptOrder}:{view:ViewKey;holds:HoldOrder[];pending:PendingOrder[];tableOrders:TableOrder[];selectedTable:TableOrder|null;setSelectedTable:(v:TableOrder|null)=>void;restoreHold:(h:HoldOrder)=>void;fillAllPending:(m:string)=>void;splitOne:(o:TableOrder)=>void;addToTable:(o:TableOrder)=>void;go:(v:ViewKey)=>void;soldOutCount:number;workOrders:WorkOrder[];now:number;acceptOrder:(id:string)=>void}) {
  if(view==='hold') return <Panel title="掛單／取單" subtitle="暫存訂單可一按恢復"><div className="list-grid">{holds.map(h=><article className="list-card" key={h.id}><div><strong>{h.title}</strong><p>{h.meta}</p></div><b>HK${h.amount}</b><button onClick={()=>restoreHold(h)}>恢復</button></article>)}</div></Panel>;
  if(view==='pending') { const groups=[...new Set(pending.map(p=>p.missing))]; return <Panel title="待補／重組" subtitle="可一鍵補充相同缺項，再個別微調"><div className="batch-actions">{groups.map(g=><button key={g} onClick={()=>fillAllPending(g)}>一鍵補充全部{g}</button>)}</div><div className="list-grid">{pending.map(p=><article className="list-card warn" key={p.id}><div><strong>{p.id} · {p.title}</strong><p>待補：{p.missing} × {p.count}</p></div><button>個別處理</button></article>)}</div></Panel> }
  if(view==='dinein') return <Panel title="堂食" subtitle="使用中 2 枱／空閒 7 枱">{selectedTable?<div className="table-detail"><button className="back-link" onClick={()=>setSelectedTable(null)}>‹ 返回枱號</button><h2>{selectedTable.table}</h2><div className="payment-summary"><span>總額 HK${selectedTable.total}</span><span className="paid">已付 HK${selectedTable.paid}</span><span className="unpaid">未付 HK${Math.max(0,selectedTable.total-selectedTable.paid)}</span></div><div className="list-grid">{selectedTable.items.map((item,index)=><article className="list-card" key={item.id}><div><strong>{index+1}. {item.product.code} {item.product.name}</strong><p>數量 {item.qty}</p></div><b>HK${item.product.price*item.qty}</b><button>拆出</button></article>)}</div><div className="table-actions"><button onClick={()=>splitOne(selectedTable)}>拆一項付款</button><button onClick={()=>addToTable(selectedTable)}>追加單</button><button>平均分單</button><button>混合付款</button></div></div>:<div className="table-grid">{['1號枱','2號枱','3號枱','4號枱','5號枱','6號枱','7號枱','8號枱','院外枱'].map(table=>{const order=tableOrders.find(t=>t.table===table);return <button key={table} className={order?'table-card active':'table-card'} onClick={()=>order&&setSelectedTable(order)}><strong>{table}</strong><span>{order?`${order.items.length}項 · HK$${order.total}`:'空枱'}</span>{order?<small>未付 HK${Math.max(0,order.total-order.paid)}</small>:null}</button>})}</div>}</Panel>;
  if(view==='workbench') {
    const active = workOrders.filter(order=>order.status==='open');
    const network = workOrders.filter(order=>order.status==='new');
    const abnormal = workOrders.filter(order=>order.status==='abnormal');
    return <Panel title="工作台" subtitle={`現正處理 ${active.length} 張；正常訂單接單後 ${AUTO_COMPLETE_MINUTES} 分鐘自動完成`}><div className="workbench-summary"><button className="network-box"><span>網絡單</span><strong>{network.length}</strong><small>待接收</small></button><button className="abnormal-box"><span>異常單</span><strong>{abnormal.length}</strong><small>需要人工處理</small></button></div><div className="work-tabs"><button className="active">現正處理 {active.length}</button><button>已完成 {workOrders.filter(order=>order.status==='completed').length}</button></div><div className="list-grid">{active.map(order=>{const elapsed=Math.floor((now-(order.acceptedAt??now))/60_000);const remaining=Math.max(0,AUTO_COMPLETE_MINUTES-elapsed);return <article className="list-card running" key={order.id}><div><strong>{order.source} · {order.id}</strong><p>已處理 {elapsed} 分鐘 · 約 {remaining} 分鐘後自動完成</p></div><b>HK${order.amount}</b><button>查看</button></article>})}{network.map(order=><article className="list-card" key={order.id}><div><strong>{order.source} · {order.id}</strong><p>新網絡訂單</p></div><b>HK${order.amount}</b><button onClick={()=>acceptOrder(order.id)}>接單</button></article>)}{abnormal.map(order=><article className="list-card warn" key={order.id}><div><strong>{order.source} · {order.id}</strong><p>{order.issue}</p></div><b>HK${order.amount}</b><button>處理</button></article>)}</div></Panel>;
  }
  if(view==='soldout') return <Panel title="售罄管理" subtitle={`目前售罄 ${soldOutCount} 款`}><div className="list-grid">{products.map(p=><article className={`list-card ${p.soldOut?'warn':''}`} key={p.id}><div><strong>{p.code} {p.name}</strong><p>{p.category}</p></div><button>{p.soldOut?'恢復':'設為售罄'}</button></article>)}</div></Panel>;
  if(view==='reprint') return <Panel title="重印" subtitle="按訂單查找收據、廚房單或標籤"><div className="list-grid">{[['#0128','收據／廚房單／標籤'],['#0127','廚房單'],['#0125','標籤'],['#0122','收據']].map(row=><article className="list-card" key={row[0]}><div><strong>{row[0]}</strong><p>{row[1]}</p></div><button>重印</button></article>)}</div></Panel>;
  if(view==='lookup') return <Panel title="查單" subtitle="按單號、來源或枱號查找"><div className="search-row"><input placeholder="輸入單號／來源／枱號"/><button>搜尋</button></div></Panel>;
  if(view==='more') return <Panel title="更多入口" subtitle="全局功能及設定"><div className="settings-grid">{['日結','銷售報表','會員設定','預約設定','裝置狀態','打印管理','快捷入口排序','系統設定'].map(item=><button key={item}>{item}<span>›</span></button>)}</div></Panel>;
  return <Panel title="返回點單" subtitle="此入口未有內容"><button className="primary" onClick={()=>go('order')}>返回點單</button></Panel>;
}

function DetailModal({item,onClose,onSave}:{item:CartItem;onClose:()=>void;onSave:(i:CartItem)=>void}) {
  const [draft,setDraft]=useState(item);
  return <div className="overlay"><section className="detail-card"><header><div><small>商品完整詳情</small><h2>{draft.product.code} {draft.product.name}</h2></div><button onClick={onClose}>×</button></header><div className="detail-columns"><div className="detail-photo">{draft.product.code}</div><div className="detail-options"><button>飯團／主食 <span>›</span></button><button>小食 <span>›</span></button><button>飲品 <span>›</span></button><button>調整 <span>›</span></button><textarea value={draft.note||''} onChange={e=>setDraft({...draft,note:e.target.value})} placeholder="商品備註"/></div><aside><h3>目前選擇</h3><p>{draft.summary||'按需要選擇或調整'}</p><div className="qty"><button onClick={()=>setDraft({...draft,qty:Math.max(1,draft.qty-1)})}>−</button><span>{draft.qty}</span><button onClick={()=>setDraft({...draft,qty:draft.qty+1})}>＋</button></div><strong>HK${draft.product.price*draft.qty}</strong><button className="primary" onClick={()=>{onSave(draft);onClose()}}>完成</button></aside></div></section></div>;
}

function Modal({title,onClose,children}:{title:string;onClose:()=>void;children:React.ReactNode}) { return <div className="overlay"><section className="modal-card"><header><h2>{title}</h2><button onClick={onClose}>×</button></header><div className="modal-body">{children}</div></section></div> }
function Panel({title,subtitle,children}:{title:string;subtitle:string;children:React.ReactNode}) { return <section className="panel-view"><header><div><small>磨飯 SMT</small><h1>{title}</h1><p>{subtitle}</p></div></header><div className="panel-content">{children}</div></section> }
