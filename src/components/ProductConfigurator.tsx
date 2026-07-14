import { useMemo, useState } from 'react';
import {
  buildCartItem,
  categoryCandidates,
  makeInitialSelections,
  updateCartItem,
} from '../domain/businessRules';
import type { CartItem, CartSelections, Product } from '../domain/types';
import { classifyCompletion } from '../morefun-core/completion';
import { Modal } from './Modal';

export function ProductConfigurator({ product, catalog, item, onSave, onClose }: {
  product: Product;
  catalog: Record<string, Product>;
  item?: CartItem;
  onSave: (selections: CartSelections, note: string, existingId?: string) => void;
  onClose: () => void;
}) {
  const [selections, setSelections] = useState<CartSelections>(() => item?.selections ?? makeInitialSelections(product, catalog));
  const [note, setNote] = useState(item?.note ?? '');
  const preview = useMemo(() => item
    ? updateCartItem(item, product, catalog, selections, note)
    : buildCartItem(product, catalog, selections, note), [item, product, catalog, selections, note]);
  const riceBalls = useMemo(() => categoryCandidates(catalog, 'rice_ball'), [catalog]);
  const snacks = useMemo(() => categoryCandidates(catalog, 'snack'), [catalog]);
  const drinks = useMemo(() => categoryCandidates(catalog, 'drink'), [catalog]);
  const completionState = classifyCompletion(preview.pendingIssues);
  const canSave = completionState !== 'blocking_invalid';
  const hasPending = completionState === 'pending_allowed';

  const patch = (value: Partial<CartSelections>) => setSelections((current) => ({ ...current, ...value }));

  return <Modal title={`${product.code} ${product.name}`} subtitle="可先加入待補；付款前必須完成。金額送單後由 Worker 重新計價" onClose={onClose} size="wide" footer={<>
    <button className="button secondary" onClick={onClose}>取消</button>
    <button className="button primary" disabled={!canSave} onClick={() => onSave(selections, note, item?.id)}>
      {item ? '儲存修改' : hasPending ? '加入並待補' : '加入購物車'} · HK${preview.estimatedUnitPrice}
    </button>
  </>}>
    <div className="configurator-layout">
      <aside className="product-preview">
        <ProductArt product={product} />
        <div><span className={`availability ${product.availability}`}>{product.availability === 'available' ? '可售' : '售罄'}</span><h3>{product.name}</h3><strong>HK${product.price}</strong></div>
      </aside>
      <section className="configurator-options">
        {product.ruleKind === 'bento' ? <>
          <OptionGroup title="飯底" required>
            {(['braised', 'curry', 'vegetable'] as const).map((value) => <Choice key={value} active={selections.riceBase === value} onClick={() => patch({ riceBase: value, noEgg: value === 'curry' ? false : selections.noEgg })}>{({ braised: '肉燥飯', curry: '咖喱飯', vegetable: '菜飯' } as const)[value]}</Choice>)}
          </OptionGroup>
          <OptionGroup title="飯量">
            {(['normal', 'less', 'half', 'more'] as const).map((value) => <Choice key={value} active={selections.riceAmount === value} onClick={() => patch({ riceAmount: value })}>{({ normal: '正常飯', less: '少飯', half: '半飯', more: '多飯' } as const)[value]}</Choice>)}
          </OptionGroup>
          {selections.riceBase !== 'curry' ? <OptionGroup title="雞蛋"><Choice active={!selections.noEgg} onClick={() => patch({ noEgg: false })}>要蛋</Choice><Choice active={selections.noEgg === true} onClick={() => patch({ noEgg: true })}>走蛋</Choice></OptionGroup> : <p className="inline-note">咖喱飯不顯示走蛋選項。</p>}
        </> : null}

        {product.ruleKind === 'custom_set' ? <>
          <ProductPicker title="飯團" products={riceBalls} selectedId={selections.riceBallId} onSelect={(riceBallId) => patch({ riceBallId })} />
          <ProductPicker title="小食" products={snacks} selectedId={selections.snackId} onSelect={(snackId) => patch({ snackId })} />
        </> : null}

        {product.ruleKind === 'rice_ball' || product.ruleKind === 'custom_set' ? <ProductPicker title="雙拼飯團（同價層 +$6）" products={riceBalls.filter((candidate) => !product.tier || candidate.tier === product.tier)} selectedId={selections.secondRiceBallId} allowNone onSelect={(secondRiceBallId) => patch({ secondRiceBallId })} /> : null}

        {product.ruleKind === 'fixed_set' || product.ruleKind === 'custom_set' ? <>
          <OptionGroup title="飲品" required>
            <Choice active={selections.noDrink === true} onClick={() => patch({ noDrink: true, drinkId: undefined })}>無需飲品 -$1</Choice>
          </OptionGroup>
          <ProductPicker title="選擇飲品" products={drinks} selectedId={selections.drinkId} onSelect={(drinkId) => patch({ drinkId, noDrink: false })} />
        </> : null}

        {product.ruleKind === 'salad' ? <>
          <OptionGroup title="第一份醬汁" required>
            {['none', '蜜糖芥末', '和風芝麻', '柚子醬'].map((value) => <Choice key={value} active={selections.saucePrimary === value} onClick={() => patch({ saucePrimary: value })}>{value === 'none' ? '不需要' : value}</Choice>)}
          </OptionGroup>
          <OptionGroup title="第二份醬汁 +$2">
            <Choice active={!selections.sauceSecondary} onClick={() => patch({ sauceSecondary: undefined })}>不需要</Choice>
            {['蜜糖芥末', '和風芝麻', '柚子醬'].map((value) => <Choice key={value} active={selections.sauceSecondary === value} onClick={() => patch({ sauceSecondary: value })}>{value}</Choice>)}
          </OptionGroup>
        </> : null}

        {product.ruleKind === 'snack' ? <OptionGroup title="蜜糖芥末醬"><Choice active={!selections.doubleSauce} onClick={() => patch({ doubleSauce: false })}>標準一份</Choice><Choice active={selections.doubleSauce === true} onClick={() => patch({ doubleSauce: true })}>雙倍醬 +$2</Choice></OptionGroup> : null}

        {product.ruleKind === 'drink' ? <>
          <OptionGroup title="冰量" required>{(['normal', 'less', 'no_ice'] as const).map((value) => <Choice key={value} active={selections.ice === value} onClick={() => patch({ ice: value })}>{({ normal: '正常冰', less: '少冰', no_ice: '走冰' } as const)[value]}</Choice>)}</OptionGroup>
          <OptionGroup title="甜度" required>{(['normal', 'less', 'no_sugar'] as const).map((value) => <Choice key={value} active={selections.sweetness === value} onClick={() => patch({ sweetness: value })}>{({ normal: '正常甜', less: '少甜', no_sugar: '走甜' } as const)[value]}</Choice>)}</OptionGroup>
        </> : null}

        <label className="field"><span>商品備註</span><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="例如：分開包裝、醬汁另上" maxLength={300} /></label>
      </section>
      <aside className="selection-summary">
        <h3>目前選擇</h3>
        <p>{preview.summary}</p>
        <div className="price-row"><span>估算單價</span><strong>HK${preview.estimatedUnitPrice}</strong></div>
        {completionState === 'blocking_invalid'
          ? <div className="issue-box"><strong>必須先修正</strong>{preview.pendingIssues.map((issue) => <p key={`${issue.kind}-${issue.message}`}>{issue.message}</p>)}</div>
          : completionState === 'pending_allowed'
            ? <div className="issue-box"><strong>可先加入待補</strong>{preview.pendingIssues.map((issue) => <p key={`${issue.kind}-${issue.message}`}>{issue.message}</p>)}</div>
            : <div className="success-box">選項完整，可以加入購物車</div>}
      </aside>
    </div>
  </Modal>;
}

function ProductPicker({ title, products, selectedId, onSelect, allowNone = false }: { title: string; products: Product[]; selectedId?: string; onSelect: (id?: string) => void; allowNone?: boolean }) {
  return <OptionGroup title={title}>{allowNone ? <Choice active={!selectedId} onClick={() => onSelect(undefined)}>不選擇</Choice> : null}{products.map((product) => <Choice key={product.id} active={selectedId === product.id} disabled={product.availability !== 'available'} onClick={() => onSelect(product.id)}><span>{product.code} {product.name}</span><small>HK${product.price}</small></Choice>)}</OptionGroup>;
}

function OptionGroup({ title, required = false, children }: { title: string; required?: boolean; children: React.ReactNode }) {
  return <fieldset className="option-group"><legend>{title}{required ? <em>必選</em> : null}</legend><div className="choice-grid">{children}</div></fieldset>;
}

function Choice({ active, disabled = false, onClick, children }: { active: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" className={`choice ${active ? 'active' : ''}`} disabled={disabled} onClick={onClick}>{children}</button>;
}

function ProductArt({ product }: { product: Product }) {
  return product.imageUrl ? <img className="product-art" src={product.imageUrl} alt="" /> : <div className="product-art fallback" aria-hidden="true">{product.code}</div>;
}
