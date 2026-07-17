import { useMemo, useState, type ReactNode } from 'react';
import {
  buildCartItem,
  categoryCandidates,
  makeInitialSelections,
  updateCartItem,
} from '../domain/businessRules';
import type { CartItem, CartSelections, Product } from '../domain/types';

export function ProductDrawer({ product, catalog, item, initialMode = item ? 'quick' : 'full', onSave, onClose }: {
  product: Product;
  catalog: Record<string, Product>;
  item?: CartItem;
  initialMode?: 'quick' | 'full';
  onSave: (selections: CartSelections, note: string, existingId?: string) => void;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<'quick' | 'full'>(initialMode);
  const [selections, setSelections] = useState<CartSelections>(() => item?.selections ?? makeInitialSelections(product, catalog));
  const [note, setNote] = useState(item?.note ?? '');
  const preview = useMemo(() => item
    ? updateCartItem(item, product, catalog, selections, note)
    : buildCartItem(product, catalog, selections, note), [item, product, catalog, selections, note]);
  const riceBalls = useMemo(() => categoryCandidates(catalog, 'rice_ball'), [catalog]);
  const snacks = useMemo(() => categoryCandidates(catalog, 'snack'), [catalog]);
  const drinks = useMemo(() => categoryCandidates(catalog, 'drink'), [catalog]);
  const patch = (value: Partial<CartSelections>) => setSelections((current) => ({ ...current, ...value }));

  return <div className="v2-drawer-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <aside className="v2-product-drawer" role="dialog" aria-modal="true" aria-label={`${product.code} ${product.name}`}>
      <header>
        <div><span>{item ? '快捷修改' : '完整商品設定'}</span><h2>{product.code} {product.name}</h2><p>{preview.summary || '單點'} · HK${preview.estimatedUnitPrice}</p></div>
        <button onClick={onClose} aria-label="關閉">×</button>
      </header>

      {mode === 'quick' ? <section className="v2-quick-edit">
        <article><strong>目前選擇</strong><p>{preview.summary || '單點'}</p></article>
        <QuickControls product={product} selections={selections} patch={patch} drinks={drinks} />
        <label><span>商品備註</span><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="例如：分開包裝、醬汁另上" /></label>
        <button className="v2-full-detail" onClick={() => setMode('full')}>查看完整設定</button>
      </section> : <div className="v2-detail-scroll">
        <RuleSection title="必選項" subtitle={preview.pendingIssues.length ? `尚欠${preview.pendingIssues.length}項` : '已完成'} tone={preview.pendingIssues.length ? 'warning' : 'success'}>
          {product.ruleKind === 'bento' ? <>
            <OptionGroup title="飯底" required>{(['braised', 'curry', 'vegetable'] as const).map((value) => <Choice key={value} active={selections.riceBase === value} onClick={() => patch({ riceBase: value, noEgg: value === 'curry' ? false : selections.noEgg })}>{({ braised: '肉燥飯', curry: '咖喱飯', vegetable: '菜飯' } as const)[value]}</Choice>)}</OptionGroup>
            <OptionGroup title="飯量">{(['normal', 'less', 'half', 'more'] as const).map((value) => <Choice key={value} active={selections.riceAmount === value} onClick={() => patch({ riceAmount: value })}>{({ normal: '正常飯', less: '少飯', half: '半飯', more: '多飯' } as const)[value]}</Choice>)}</OptionGroup>
            {selections.riceBase !== 'curry' ? <OptionGroup title="雞蛋"><Choice active={!selections.noEgg} onClick={() => patch({ noEgg: false })}>要蛋</Choice><Choice active={selections.noEgg === true} onClick={() => patch({ noEgg: true })}>走蛋</Choice></OptionGroup> : null}
          </> : null}

          {product.ruleKind === 'fixed_set' || product.ruleKind === 'custom_set' ? <>
            <OptionGroup title="飲品" required><Choice active={selections.noDrink === true} onClick={() => patch({ noDrink: true, drinkId: undefined })}>無需飲品 −$1</Choice></OptionGroup>
            <ProductPicker title="選擇飲品" products={drinks} selectedId={selections.drinkId} onSelect={(drinkId) => patch({ drinkId, noDrink: false })} />
          </> : null}

          {product.ruleKind === 'salad' ? <OptionGroup title="第一份醬汁" required>{['none', '蜜糖芥末', '和風芝麻', '柚子醬'].map((value) => <Choice key={value} active={selections.saucePrimary === value} onClick={() => patch({ saucePrimary: value })}>{value === 'none' ? '不需要' : value}</Choice>)}</OptionGroup> : null}

          {product.ruleKind === 'drink' ? <>
            <OptionGroup title="冰量" required>{(['normal', 'less', 'no_ice'] as const).map((value) => <Choice key={value} active={selections.ice === value} onClick={() => patch({ ice: value })}>{({ normal: '正常冰', less: '少冰', no_ice: '走冰' } as const)[value]}</Choice>)}</OptionGroup>
            <OptionGroup title="甜度" required>{(['normal', 'less', 'no_sugar'] as const).map((value) => <Choice key={value} active={selections.sweetness === value} onClick={() => patch({ sweetness: value })}>{({ normal: '正常甜', less: '少甜', no_sugar: '走甜' } as const)[value]}</Choice>)}</OptionGroup>
          </> : null}
        </RuleSection>

        <RuleSection title="共享選項" subtitle="套餐內共用選擇">
          {product.ruleKind === 'custom_set' ? <>
            <ProductPicker title="飯團" products={riceBalls} selectedId={selections.riceBallId} onSelect={(riceBallId) => patch({ riceBallId })} />
            <ProductPicker title="小食" products={snacks} selectedId={selections.snackId} onSelect={(snackId) => patch({ snackId })} />
          </> : <p className="v2-empty-rule">此商品沒有共享選項要求。</p>}
        </RuleSection>

        <RuleSection title="連動加配" subtitle="加配、升級及差額">
          {product.ruleKind === 'rice_ball' || product.ruleKind === 'custom_set' ? <ProductPicker title="雙拼飯團（同價層 +$6）" products={riceBalls.filter((candidate) => !product.tier || candidate.tier === product.tier)} selectedId={selections.secondRiceBallId} allowNone onSelect={(secondRiceBallId) => patch({ secondRiceBallId })} /> : null}
          {product.ruleKind === 'salad' ? <OptionGroup title="第二份醬汁 +$2"><Choice active={!selections.sauceSecondary} onClick={() => patch({ sauceSecondary: undefined })}>不需要</Choice>{['蜜糖芥末', '和風芝麻', '柚子醬'].map((value) => <Choice key={value} active={selections.sauceSecondary === value} onClick={() => patch({ sauceSecondary: value })}>{value}</Choice>)}</OptionGroup> : null}
          {product.ruleKind === 'snack' ? <OptionGroup title="蜜糖芥末醬"><Choice active={!selections.doubleSauce} onClick={() => patch({ doubleSauce: false })}>標準一份</Choice><Choice active={selections.doubleSauce === true} onClick={() => patch({ doubleSauce: true })}>雙倍醬 +$2</Choice></OptionGroup> : null}
          {!['rice_ball', 'custom_set', 'salad', 'snack'].includes(product.ruleKind) ? <p className="v2-empty-rule">此商品沒有連動加配選項。</p> : null}
        </RuleSection>

        <label className="v2-note-field"><span>商品備註</span><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="例如：分開包裝、醬汁另上" /></label>
      </div>}

      <footer>
        <div><span>{preview.pendingIssues.length ? `尚有${preview.pendingIssues.length}項未完成` : '選項完整'}</span><strong>HK${preview.estimatedUnitPrice}</strong></div>
        <button className="secondary" onClick={onClose}>取消</button>
        <button className="primary" disabled={preview.pendingIssues.length > 0} onClick={() => onSave(selections, note, item?.id)}>{item ? '儲存修改' : '加入訂單'}</button>
      </footer>
    </aside>
  </div>;
}

function QuickControls({ product, selections, patch, drinks }: { product: Product; selections: CartSelections; patch: (value: Partial<CartSelections>) => void; drinks: Product[] }) {
  if (product.ruleKind === 'drink') return <div className="v2-quick-controls"><OptionGroup title="冰量">{(['normal', 'less', 'no_ice'] as const).map((value) => <Choice key={value} active={selections.ice === value} onClick={() => patch({ ice: value })}>{({ normal: '正常冰', less: '少冰', no_ice: '走冰' } as const)[value]}</Choice>)}</OptionGroup><OptionGroup title="甜度">{(['normal', 'less', 'no_sugar'] as const).map((value) => <Choice key={value} active={selections.sweetness === value} onClick={() => patch({ sweetness: value })}>{({ normal: '正常甜', less: '少甜', no_sugar: '走甜' } as const)[value]}</Choice>)}</OptionGroup></div>;
  if (product.ruleKind === 'bento') return <div className="v2-quick-controls"><OptionGroup title="飯量">{(['normal', 'less', 'half', 'more'] as const).map((value) => <Choice key={value} active={selections.riceAmount === value} onClick={() => patch({ riceAmount: value })}>{({ normal: '正常飯', less: '少飯', half: '半飯', more: '多飯' } as const)[value]}</Choice>)}</OptionGroup></div>;
  if (product.ruleKind === 'fixed_set' || product.ruleKind === 'custom_set') return <ProductPicker title="飲品" products={drinks} selectedId={selections.drinkId} onSelect={(drinkId) => patch({ drinkId, noDrink: false })} />;
  return <p className="v2-empty-rule">常用修改已保留；其他選項請進入完整設定。</p>;
}

function RuleSection({ title, subtitle, tone = 'info', children }: { title: string; subtitle: string; tone?: string; children: ReactNode }) {
  return <section className="v2-rule-section"><header><strong>{title}</strong><span className={tone}>{subtitle}</span></header><div>{children}</div></section>;
}

function ProductPicker({ title, products, selectedId, onSelect, allowNone = false }: { title: string; products: Product[]; selectedId?: string; onSelect: (id?: string) => void; allowNone?: boolean }) {
  return <OptionGroup title={title}>{allowNone ? <Choice active={!selectedId} onClick={() => onSelect(undefined)}>不選擇</Choice> : null}{products.map((candidate) => <Choice key={candidate.id} active={selectedId === candidate.id} disabled={candidate.availability !== 'available'} onClick={() => onSelect(candidate.id)}><span>{candidate.code} {candidate.name}</span><small>HK${candidate.price}</small></Choice>)}</OptionGroup>;
}

function OptionGroup({ title, required = false, children }: { title: string; required?: boolean; children: ReactNode }) {
  return <fieldset className="v2-option-group"><legend>{title}{required ? <em>必選</em> : null}</legend><div>{children}</div></fieldset>;
}

function Choice({ active, disabled = false, onClick, children }: { active: boolean; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return <button type="button" className={`v2-choice ${active ? 'active' : ''}`} disabled={disabled} onClick={onClick}>{children}</button>;
}
