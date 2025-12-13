import { useFormContext } from 'react-hook-form';
import type { EventRequestFormData } from '@app/routes/request._index';
import type { StoreProduct } from '@medusajs/types';
import clsx from 'clsx';

interface ProductSelectorProps {
  products: StoreProduct[];
  currencyCode?: string;
}

export const ProductSelector = ({ products, currencyCode = 'usd' }: ProductSelectorProps) => {
  const { watch, setValue } = useFormContext<EventRequestFormData>();
  const selected = watch('selected_products') || [];

  const toggleProduct = (productId: string) => {
    const existing = selected.find((p) => p.product_id === productId);
    if (existing) {
      setValue(
        'selected_products',
        selected.filter((p) => p.product_id !== productId),
        { shouldValidate: true },
      );
    } else {
      setValue('selected_products', [...selected, { product_id: productId, quantity: 1 }], { shouldValidate: true });
    }
  };

  const updateQuantity = (productId: string, delta: number) => {
    const next = selected.map((p) =>
      p.product_id === productId ? { ...p, quantity: Math.max(1, p.quantity + delta) } : p,
    );
    setValue('selected_products', next, { shouldValidate: true });
  };

  const isSelected = (productId: string) => selected.some((p) => p.product_id === productId);

  const getPrice = (product: StoreProduct) => {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/d5974850-2a8e-400f-94b8-c1dc9368bb2d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProductSelector.tsx:37',message:'getPrice entry',data:{productId:product.id,productTitle:product.title,currencyCode,variantsCount:product.variants?.length,firstVariantPrices:product.variants?.[0]?.prices?.map(p=>({amount:p.amount,currency:p.currency_code}))},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    const price = product.variants?.[0]?.prices?.find((p) => p.currency_code === currencyCode);
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/d5974850-2a8e-400f-94b8-c1dc9368bb2d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProductSelector.tsx:39',message:'getPrice price lookup',data:{productId:product.id,foundPrice:price?{amount:price.amount,currency:price.currency_code}:null,allPrices:product.variants?.[0]?.prices?.map(p=>({amount:p.amount,currency:p.currency_code}))},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    if (!price) return 'N/A';
    const formatted = (price.amount / 100).toLocaleString(undefined, {
      style: 'currency',
      currency: price.currency_code.toUpperCase(),
      minimumFractionDigits: 2,
    });
    return formatted;
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-primary-700">
        Select bento boxes for pickup. You can adjust quantities before submitting your request.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {products.map((product) => {
          const selectedProduct = selected.find((p) => p.product_id === product.id);
          return (
            <div
              key={product.id}
              className={clsx(
                'border rounded-lg p-4 shadow-sm bg-white transition',
                isSelected(product.id) ? 'border-accent-500 ring-1 ring-accent-200' : 'border-gray-200',
              )}
            >
              {product.thumbnail && (
                <img
                  src={product.thumbnail}
                  alt={product.title}
                  className="w-full h-40 object-cover rounded-md mb-3"
                  loading="lazy"
                />
              )}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-base font-semibold text-primary-900">{product.title}</h4>
                  <p className="text-sm text-primary-700">{getPrice(product)}</p>
                </div>
                <button
                  type="button"
                  className="text-sm text-accent-600 hover:text-accent-700"
                  onClick={() => toggleProduct(product.id)}
                >
                  {isSelected(product.id) ? 'Remove' : 'Select'}
                </button>
              </div>

              {isSelected(product.id) && (
                <div className="mt-3 flex items-center gap-3">
                  <span className="text-sm text-primary-700">Qty</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="px-2 py-1 rounded border"
                      onClick={() => updateQuantity(product.id, -1)}
                    >
                      -
                    </button>
                    <span className="w-8 text-center">{selectedProduct?.quantity ?? 1}</span>
                    <button
                      type="button"
                      className="px-2 py-1 rounded border"
                      onClick={() => updateQuantity(product.id, 1)}
                    >
                      +
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
