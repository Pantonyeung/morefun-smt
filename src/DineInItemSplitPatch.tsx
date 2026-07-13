import { useEffect, useMemo, useState } from 'react';

type LineItem = { id: string; label: string; amount: number };
type Group = { id: string; itemIds: string[]; paid: boolean };

const tableItems: Record<string, LineItem[]> = {
  '2號枱': [
    { id: '1', label: 'F1 招牌雞扒紫米飯團餐', amount: 51 },
    { id: '2', label: 'D01 台式奶茶', amount: 18 },
    { id: '3', label: '12 古早鹽酥雞肉燥飯', amount: 52 },
    { id: '4', label: 'D02 凍檸檬茶', amount: 20 },
    { id: '5', label: 'S1 紫米能量沙律', amount: 48 },
  ],
  '6號枱': [{ id: '1', label: 'S1 紫米能量沙律', amount: 48 }],
};

export default function DineInItemSplitPatch() {
  const [open, setOpen] = useState(false);
  const [tableName, setTableName] = useState('2號枱');
  const [activeGroup, setActiveGroup] = useState('A');
  const [groups, setGroups] = useState<Group[]>([
    { id: 'A', itemIds: [], paid: false },
    { id: 'B', itemIds: [], paid: false },
  ]);

  useEffect(() => {
    const install = () => {
      document.querySelectorAll('.split-control').forEach(node => {
        (node as HTMLElement).style.display = 'none';
      });
      const actions = document.querySelector('.table-detail .table-actions');
      if (!actions || actions.querySelector('[data-item-split]')) return;
      const button = document.createElement('button');
      button.textContent = '按商品拆單';
      button.dataset.itemSplit = 'true';
      button.addEventListener('click', () => {
        const title = document.querySelector('.table-detail h2')?.textContent?.trim() || '2號枱';
        setTableName(title);
        setGroups([{ id: 'A', itemIds: [], paid: false }, { id: 'B', itemIds: [], paid: false }]);
        setActiveGroup('A');
        setOpen(true);
      });
      actions.insertBefore(button, actions.children[1] ?? null);
    };
    install();
    const observer = new MutationObserver(install);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  const items = tableItems[tableName] ?? tableItems['2號枱'];
  const assigned = useMemo(() => new Map(groups.flatMap(group => group.itemIds.map(id => [id, group.id] as const))), [groups]);
  const amountFor = (group: Group) => group.itemIds.reduce((sum, id) => sum + (items.find(item => item.id === id)?.amount ?? 0), 0);

  const toggleItem = (itemId: string) => {
    setGroups(current => current.map(group => {
      if (group.id === activeGroup) {
        const exists = group.itemIds.includes(itemId);
        return { ...group, itemIds: exists ? group.itemIds.filter(id => id !== itemId) : [...group.itemIds, itemId] };
      }
      return { ...group, itemIds: group.itemIds.filter(id => id !== itemId) };
    }));
  };

  const addGroup = () => {
    if (groups.length >= items.length) return;
    const id = String.fromCharCode(65 + groups.length);
    setGroups(current => [...current, { id, itemIds: [], paid: false }]);
    setActiveGroup(id);
  };

  const markPaid = (id: string) => setGroups(current => current.map(group => group.id === id ? { ...group, paid: true } : group));

  if (!open) return null;
  return <div className="item-split-overlay" onClick={() => setOpen(false)}>
    <section className="item-split-card" onClick={event => event.stopPropagation()}>
      <header><div><small>堂食按商品拆單</small><h2>{tableName}</h2></div><button onClick={() => setOpen(false)}>×</button></header>
      <p className="item-split-help">最多可拆成實際商品項目數。每件商品只可分配到一張付款單，不會把總額平均除人數。</p>
      <div className="item-split-tabs">
        {groups.map(group => <button key={group.id} className={activeGroup === group.id ? 'active' : ''} onClick={() => setActiveGroup(group.id)}>付款單 {group.id} · HK${amountFor(group)}{group.paid ? ' · 已付' : ''}</button>)}
        <button disabled={groups.length >= items.length} onClick={addGroup}>＋新增付款單</button>
      </div>
      <div className="item-split-list">
        {items.map(item => {
          const owner = assigned.get(item.id);
          return <button key={item.id} className={owner === activeGroup ? 'active' : ''} onClick={() => toggleItem(item.id)}>
            <span>{item.label}</span><strong>HK${item.amount}</strong><small>{owner ? `付款單 ${owner}` : '未分配'}</small>
          </button>;
        })}
      </div>
      <div className="item-split-summary">
        {groups.map(group => <article key={group.id}><div><strong>付款單 {group.id}</strong><span>{group.itemIds.length} 項 · HK${amountFor(group)}</span></div><button disabled={!group.itemIds.length || group.paid} onClick={() => markPaid(group.id)}>{group.paid ? '已付款' : '模擬付款'}</button></article>)}
      </div>
    </section>
  </div>;
}
