'use client';

import type React from 'react';
import type { ExternalToast } from 'sonner';

import { toast as sonnerToast } from 'sonner';
type titleT = (() => React.ReactNode) | React.ReactNode;

type ToastProps = ExternalToast;

function toast(message: titleT, data?: ToastProps, type: 'global' | 'feature' = 'global') {
  return sonnerToast(message, { ...data, toasterId: type });
}
toast.success = (message: titleT, data?: ToastProps, type: 'global' | 'feature' = 'global') => {
  return sonnerToast.success(message, { ...data, toasterId: type });
};
toast.error = (message: titleT, data?: ToastProps, type: 'global' | 'feature' = 'global') => {
  return sonnerToast.error(message, { ...data, toasterId: type });
};
toast.promise = function <TPromise>(
  promise: Promise<TPromise>,
  data?: ToastProps,
  type: 'global' | 'feature' = 'global',
) {
  return sonnerToast.promise<TPromise>(promise, { ...data, toasterId: type });
};
toast.loading = (message: titleT, data?: ToastProps, type: 'global' | 'feature' = 'global') => {
  return sonnerToast.loading(message, { ...data, toasterId: type });
};
toast.dismiss = (id: string) => {
  return sonnerToast.dismiss(id);
};

function toastGlobal(message: titleT, data?: ToastProps) {
  return sonnerToast(message, { ...data, toasterId: 'global' });
}

toastGlobal.success = (message: titleT, data?: ToastProps) => {
  return sonnerToast.success(message, { ...data, toasterId: 'global' });
};
toastGlobal.error = (message: titleT, data?: ToastProps) => {
  return sonnerToast.error(message, { ...data, toasterId: 'global' });
};
toastGlobal.promise = function <TPromise>(promise: Promise<TPromise>, data?: ToastProps) {
  return sonnerToast.promise<TPromise>(promise, {
    ...data,
    toasterId: 'global',
  });
};
toastGlobal.loading = (message: titleT, data?: ToastProps) => {
  return sonnerToast.loading(message, { ...data, toasterId: 'global' });
};
toastGlobal.dismiss = (id: string) => {
  return sonnerToast.dismiss(id);
};

function toastFeature(message: titleT, data?: ToastProps) {
  return sonnerToast(message, { ...data, toasterId: 'feature' });
}

toastFeature.success = (message: titleT, data?: ToastProps) => {
  return sonnerToast.success(message, { ...data, toasterId: 'feature' });
};
toastFeature.error = (message: titleT, data?: ToastProps) => {
  return sonnerToast.error(message, { ...data, toasterId: 'feature' });
};
toastFeature.promise = function <TPromise>(promise: Promise<TPromise>, data?: ToastProps) {
  return sonnerToast.promise<TPromise>(promise, {
    ...data,
    toasterId: 'feature',
  });
};
toastFeature.loading = (message: titleT, data?: ToastProps) => {
  return sonnerToast.loading(message, { ...data, toasterId: 'feature' });
};
toastFeature.dismiss = (id: string) => {
  return sonnerToast.dismiss(id);
};

export { toast, toastFeature, toastGlobal };
