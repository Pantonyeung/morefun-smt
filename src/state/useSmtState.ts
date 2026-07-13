import { useMemo, useReducer } from 'react';
import {
  initialSMTState,
  selectAbnormalOrderCount,
  selectCartItems,
  selectCartQty,
  selectCartTotal,
  selectHealthIssueCount,
  selectNewNetworkOrderCount,
  selectOccupiedTableCount,
  selectOpenPendingIssues,
  selectSoldOutCount,
  smtReducer,
  type CartItem,
  type PendingKind,
  type SMTAction,
  type SMTState,
  type ViewKey,
} from './smtState';

export interface SmtSelectors {
  cartItems: CartItem[];
  cartQty: number;
  cartTotal: number;
  openPendingCount: number;
  occupiedTableCount: number;
  newNetworkOrderCount: number;
  abnormalOrderCount: number;
  soldOutCount: number;
  healthIssueCount: number;
}

export interface SmtActions {
  dispatch: React.Dispatch<SMTAction>;
  navigate: (view: ViewKey) => void;
  openModal: (modal: Exclude<SMTState['ui']['modal'], null>, activeCartItemId?: string) => void;
  closeModal: () => void;
  addCartItem: (item: CartItem) => void;
  updateCartItem: (item: CartItem) => void;
  removeCartItem: (itemId: string) => void;
  clearCart: () => void;
  setOrderNote: (note: string) => void;
  resolvePendingBatch: (kind: PendingKind, replacementProductId?: string, priceDelta?: number) => void;
}

export function useSmtState(): { state: SMTState; selectors: SmtSelectors; actions: SmtActions } {
  const [state, dispatch] = useReducer(smtReducer, initialSMTState);

  const selectors = useMemo<SmtSelectors>(() => ({
    cartItems: selectCartItems(state),
    cartQty: selectCartQty(state),
    cartTotal: selectCartTotal(state),
    openPendingCount: selectOpenPendingIssues(state).length,
    occupiedTableCount: selectOccupiedTableCount(state),
    newNetworkOrderCount: selectNewNetworkOrderCount(state),
    abnormalOrderCount: selectAbnormalOrderCount(state),
    soldOutCount: selectSoldOutCount(state),
    healthIssueCount: selectHealthIssueCount(state),
  }), [state]);

  const actions = useMemo<SmtActions>(() => ({
    dispatch,
    navigate: (view) => dispatch({ type: 'NAVIGATE', view }),
    openModal: (modal, activeCartItemId) => dispatch({ type: 'OPEN_MODAL', modal, activeCartItemId }),
    closeModal: () => dispatch({ type: 'CLOSE_MODAL' }),
    addCartItem: (item) => dispatch({ type: 'ADD_CART_ITEM', item }),
    updateCartItem: (item) => dispatch({ type: 'UPDATE_CART_ITEM', item }),
    removeCartItem: (itemId) => dispatch({ type: 'REMOVE_CART_ITEM', itemId }),
    clearCart: () => dispatch({ type: 'CLEAR_CART' }),
    setOrderNote: (note) => dispatch({ type: 'SET_ORDER_NOTE', note }),
    resolvePendingBatch: (kind, replacementProductId, priceDelta) => dispatch({
      type: 'RESOLVE_PENDING_BATCH',
      kind,
      replacementProductId,
      priceDelta,
    }),
  }), []);

  return { state, selectors, actions };
}
