'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import api from '@/lib/api';

type FormTab = 'BASIC' | 'VISUAL';

type UseContentFormOptions<
  TItem extends { id: string },
  TForm,
  TErrors extends Record<string, string | undefined>,
> = {
  items: TItem[];
  loading: boolean;
  emptyForm: TForm;
  buildFormFromItem: (item: TItem) => TForm;
  validate: (form: TForm) => TErrors;
  buildPayload: (form: TForm) => Record<string, unknown>;
  resourcePath: string;
  canManage: boolean;
  load: () => Promise<void>;
  removeItem: (id: string) => Promise<void>;
};

export default function useContentForm<
  TItem extends { id: string },
  TForm extends Record<string, unknown>,
  TErrors extends Record<string, string | undefined>,
>({
  items,
  loading,
  emptyForm,
  buildFormFromItem,
  validate,
  buildPayload,
  resourcePath,
  canManage,
  load,
  removeItem,
}: UseContentFormOptions<TItem, TForm, TErrors>) {
  const router = useRouter();
  const pathname = usePathname();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TItem | null>(null);
  const [form, setForm] = useState<TForm>(emptyForm);
  const [formTab, setFormTab] = useState<FormTab>('BASIC');
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<TErrors>({} as TErrors);
  const [touched, setTouched] = useState<Partial<Record<keyof TErrors, boolean>>>({});
  const [confirmTarget, setConfirmTarget] = useState<TItem | null>(null);
  const [shareTarget, setShareTarget] = useState<TItem | null>(null);
  const [removing, setRemoving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const currentEditing = useMemo(
    () => (editing ? items.find((item) => item.id === editing.id) ?? editing : null),
    [editing, items],
  );

  const clearEditParam = useCallback(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    if (!params.has('edit')) return;

    params.delete('edit');
    const nextQuery = params.toString();

    setEditId(null);
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  }, [pathname, router]);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditing(null);
    clearEditParam();
  }, [clearEditParam]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setEditId(new URLSearchParams(window.location.search).get('edit'));
  }, []);

  const openCreate = useCallback(() => {
    if (!canManage) return;

    setEditing(null);
    setForm(emptyForm);
    setFormErrors({} as TErrors);
    setTouched({});
    setFormTab('BASIC');
    setModalOpen(true);
  }, [canManage, emptyForm]);

  const openEdit = useCallback(
    (item: TItem) => {
      if (!canManage) return;

      setEditing(item);
      setForm(buildFormFromItem(item));
      setFormErrors({} as TErrors);
      setTouched({});
      setFormTab('BASIC');
      setModalOpen(true);
    },
    [buildFormFromItem, canManage],
  );

  useEffect(() => {
    if (!editId || loading) return;

    const target = items.find((item) => item.id === editId);
    if (!target) return;
    if (modalOpen && editing?.id === target.id) return;

    openEdit(target);
  }, [editId, editing?.id, items, loading, modalOpen, openEdit]);

  const handleFieldBlur = useCallback(
    (field: keyof TErrors) => {
      setTouched((prev) => ({ ...prev, [field]: true }));
      const errors = validate(form);
      setFormErrors((prev) => ({ ...prev, [field]: errors[field] }));
    },
    [form, validate],
  );

  const clearFieldError = useCallback((field: keyof TErrors) => {
    setFormErrors((prev) => ({ ...prev, [field]: undefined }));
  }, []);

  const save = useCallback(async () => {
    if (!canManage) return;

    const errors = validate(form);
    setFormErrors(errors);
    setTouched(
      Object.keys(errors).reduce(
        (acc, key) => ({ ...acc, [key]: true }),
        {} as Partial<Record<keyof TErrors, boolean>>,
      ),
    );
    if (Object.values(errors).some(Boolean)) return;

    setSaving(true);
    try {
      const payload = buildPayload(form);

      if (editing) {
        await api.patch(`${resourcePath}/${editing.id}`, payload);
      } else {
        await api.post(resourcePath, payload);
      }

      closeModal();
      await load();
    } finally {
      setSaving(false);
    }
  }, [buildPayload, canManage, closeModal, editing, form, load, resourcePath, validate]);

  const remove = useCallback(async () => {
    if (!canManage || !confirmTarget) return;

    setRemoving(true);
    try {
      await removeItem(confirmTarget.id);

      if (editing?.id === confirmTarget.id) {
        closeModal();
      }
    } catch {
      // O interceptor global já notifica o erro.
    } finally {
      setRemoving(false);
      setConfirmTarget(null);
    }
  }, [canManage, closeModal, confirmTarget, editing?.id, removeItem]);

  return {
    modalOpen,
    editing,
    form,
    setForm,
    formTab,
    setFormTab,
    saving,
    formErrors,
    touched,
    handleFieldBlur,
    clearFieldError,
    confirmTarget,
    setConfirmTarget,
    shareTarget,
    setShareTarget,
    removing,
    currentEditing,
    openCreate,
    openEdit,
    closeModal,
    save,
    remove,
  };
}
