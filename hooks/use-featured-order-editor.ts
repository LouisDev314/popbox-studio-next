'use client';

import { useCallback, useMemo, useReducer } from 'react';
import type { IAdminFeaturedOrderResponse } from '@/interfaces/product';

export type FeaturedEditorError =
  | { kind: 'conflict'; message: string }
  | { kind: 'request'; message: string }
  | { kind: 'sync'; message: string };

interface IFeaturedEditorState {
  baseline: IAdminFeaturedOrderResponse | null;
  draftIds: string[];
  error: FeaturedEditorError | null;
  isInitialized: boolean;
  notice: string | null;
}

type FeaturedEditorAction =
  | { type: 'clearError' }
  | { type: 'commit'; order: IAdminFeaturedOrderResponse }
  | { type: 'discard' }
  | { type: 'observe'; order: IAdminFeaturedOrderResponse; isLocalMembershipMutation: boolean }
  | { type: 'reconcile'; order: IAdminFeaturedOrderResponse; showNotice: boolean }
  | { type: 'remove'; productId: string }
  | { type: 'replaceDraft'; draftIds: string[] }
  | { type: 'setError'; error: FeaturedEditorError };

function idsMatch(left: readonly string[], right: readonly string[]) {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}

function getBaselineIds(state: IFeaturedEditorState) {
  return state.baseline?.items.map((item) => item.id) ?? [];
}

function isDirty(state: IFeaturedEditorState) {
  return state.isInitialized && !idsMatch(state.draftIds, getBaselineIds(state));
}

function reconcileDraft(
  baselineIds: readonly string[],
  draftIds: readonly string[],
  nextServerIds: readonly string[],
) {
  const baselineIdSet = new Set(baselineIds);
  const serverIdSet = new Set(nextServerIds);
  const retainedDraftIds = draftIds.filter((id) => serverIdSet.has(id));
  const newlyAddedIds = nextServerIds.filter((id) => !baselineIdSet.has(id));

  return {
    addedCount: newlyAddedIds.length,
    draftIds: [...retainedDraftIds, ...newlyAddedIds],
    removedCount: baselineIds.filter((id) => !serverIdSet.has(id)).length,
  };
}

function reconcileState(
  state: IFeaturedEditorState,
  order: IAdminFeaturedOrderResponse,
  showNotice: boolean,
): IFeaturedEditorState {
  const reconciliation = reconcileDraft(
    getBaselineIds(state),
    state.draftIds,
    order.items.map((item) => item.id),
  );
  const changes: string[] = [];

  if (reconciliation.addedCount) {
    changes.push(`${reconciliation.addedCount} added`);
  }
  if (reconciliation.removedCount) {
    changes.push(`${reconciliation.removedCount} removed`);
  }

  return {
    baseline: order,
    draftIds: reconciliation.draftIds,
    error: null,
    isInitialized: true,
    notice: showNotice
      ? changes.length
        ? `Featured products reloaded (${changes.join(', ')}). Your remaining local order and removals were kept.`
        : 'Featured products reloaded. Your local draft was kept.'
      : null,
  };
}

function reducer(state: IFeaturedEditorState, action: FeaturedEditorAction): IFeaturedEditorState {
  switch (action.type) {
    case 'clearError':
      return { ...state, error: null, notice: null };
    case 'commit':
      return {
        baseline: action.order,
        draftIds: action.order.items.map((item) => item.id),
        error: null,
        isInitialized: true,
        notice: null,
      };
    case 'discard':
      return {
        ...state,
        draftIds: getBaselineIds(state),
        error: null,
        notice: null,
      };
    case 'observe': {
      if (!state.isInitialized || !isDirty(state)) {
        return reducer(state, { type: 'commit', order: action.order });
      }

      if (action.order.membershipSignature === state.baseline?.membershipSignature) {
        return state;
      }

      return action.isLocalMembershipMutation
        ? reconcileState(state, action.order, false)
        : {
          ...state,
          error: {
            kind: 'conflict',
            message: 'Featured membership changed while you were editing. Your local draft is still available; reload and reconcile before saving.',
          },
          notice: null,
        };
    }
    case 'reconcile':
      return reconcileState(state, action.order, action.showNotice);
    case 'remove':
      return {
        ...state,
        draftIds: state.draftIds.filter((id) => id !== action.productId),
        error: null,
        notice: null,
      };
    case 'replaceDraft':
      return { ...state, draftIds: action.draftIds, error: null, notice: null };
    case 'setError':
      return { ...state, error: action.error, notice: null };
    default:
      return state;
  }
}

export function useFeaturedOrderEditor(initialOrder: IAdminFeaturedOrderResponse | null, isReady: boolean) {
  const [state, dispatch] = useReducer(reducer, {
    baseline: initialOrder,
    draftIds: initialOrder?.items.map((item) => item.id) ?? [],
    error: null,
    isInitialized: isReady && initialOrder !== null,
    notice: null,
  });
  const baselineIds = useMemo(
    () => state.baseline?.items.map((item) => item.id) ?? [],
    [state.baseline],
  );

  return {
    baselineIds,
    clearError: useCallback(() => dispatch({ type: 'clearError' }), []),
    commit: useCallback((order: IAdminFeaturedOrderResponse) => {
      dispatch({ type: 'commit', order });
    }, []),
    discard: useCallback(() => dispatch({ type: 'discard' }), []),
    draftIds: state.draftIds,
    error: state.error,
    isDirty: state.isInitialized && !idsMatch(state.draftIds, baselineIds),
    isInitialized: state.isInitialized,
    notice: state.notice,
    observe: useCallback((order: IAdminFeaturedOrderResponse, isLocalMembershipMutation: boolean) => {
      dispatch({ type: 'observe', order, isLocalMembershipMutation });
    }, []),
    persistedOrder: state.baseline,
    reconcile: useCallback((order: IAdminFeaturedOrderResponse, showNotice = true) => {
      dispatch({ type: 'reconcile', order, showNotice });
    }, []),
    remove: useCallback((productId: string) => dispatch({ type: 'remove', productId }), []),
    replaceDraft: useCallback((draftIds: string[]) => dispatch({ type: 'replaceDraft', draftIds }), []),
    setError: useCallback((error: FeaturedEditorError) => dispatch({ type: 'setError', error }), []),
  };
}
