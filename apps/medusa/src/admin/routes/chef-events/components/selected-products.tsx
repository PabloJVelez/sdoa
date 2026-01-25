import { Badge, Label } from '@medusajs/ui';
import { useQuery } from '@tanstack/react-query';
import { sdk } from '../../../../sdk';

interface SelectedProductsProps {
  selectedProducts?: Array<{ product_id: string; quantity: number }>;
}

interface ProductInfo {
  id: string;
  title: string;
  handle?: string;
  thumbnail?: string;
}

interface MedusaAdminProduct {
  id: string;
  title: string;
  handle: string;
  thumbnail: string | null;
  description?: string;
  subtitle?: string | null;
}

interface MedusaProductResponse {
  product: MedusaAdminProduct;
}

export const SelectedProducts = ({ selectedProducts }: SelectedProductsProps) => {
  // Fetch product details for each selected product
  const productIds = selectedProducts?.map((p) => p.product_id).filter(Boolean) || [];

  const {
    data: products,
    isLoading,
    error,
  } = useQuery<ProductInfo[]>({
    queryKey: ['products', productIds],
    enabled: productIds.length > 0,
    queryFn: async () => {
      // Fetch products using Medusa Admin SDK product methods
      const results = await Promise.all(
        productIds.map(async (id) => {
          try {
            // Try using Admin SDK product.retrieve if available
            let product: MedusaAdminProduct | null = null;

            if ((sdk.admin as any).product?.retrieve) {
              // Use built-in Admin SDK product method
              const response = await (sdk.admin as any).product.retrieve(id);
              product = response?.product || response;
            } else {
              // Fallback to manual fetch
              const response = (await (sdk.admin as any).client.fetch(`/admin/products/${id}`, {
                method: 'GET',
              })) as MedusaProductResponse;

              // Handle response structure - could be { product: {...} } or direct product
              product = (response as any).product || (response as any);
            }

            if (!product) {
              throw new Error(`Product ${id} response is empty`);
            }

            if (!product.title) {
              throw new Error(`Product ${id} missing title in response`);
            }

            return {
              id: product.id || id,
              title: product.title,
              handle: product.handle,
              thumbnail: product.thumbnail || undefined,
            };
          } catch (error) {
            console.error(`Error fetching product ${id}:`, error);
            // Fallback: return basic info with just the ID
            return {
              id,
              title: `Product ${id.substring(0, 12)}...`,
              handle: undefined,
              thumbnail: undefined,
            };
          }
        }),
      );
      return results;
    },
  });

  if (!selectedProducts || selectedProducts.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between mb-4">
          <Label className="text-base font-semibold">Selected Products</Label>
        </div>
        <p className="text-sm text-gray-500">No products selected</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between mb-4">
          <Label className="text-base font-semibold">Selected Products</Label>
          <Badge>
            {selectedProducts?.length || 0} item{(selectedProducts?.length || 0) !== 1 ? 's' : ''}
          </Badge>
        </div>
        <p className="text-sm text-gray-500">Loading product details...</p>
      </div>
    );
  }

  if (error) {
    console.error('Error loading products:', error);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <Label className="text-base font-semibold">Selected Products</Label>
        <Badge>
          {selectedProducts.length} item{selectedProducts.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      <div className="space-y-2">
        {selectedProducts.map((selected, index) => {
          const product = products?.find((p) => p.id === selected.product_id);

          // Determine product title - prioritize fetched product title
          let productTitle: string;
          if (product?.title) {
            productTitle = product.title;
          } else if (isLoading) {
            productTitle = 'Loading...';
          } else {
            // Fallback: show product ID if title not available
            productTitle = `Product ${selected.product_id.substring(0, 12)}...`;
          }

          return (
            <div
              key={`${selected.product_id}-${index}`}
              className="flex items-center justify-between p-3 border border-[var(--border-base)] rounded bg-[var(--bg-subtle)]"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {product?.thumbnail && (
                  <img
                    src={product.thumbnail}
                    alt={productTitle}
                    className="w-12 h-12 object-cover rounded flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate" title={productTitle}>
                    {productTitle}
                  </p>
                </div>
              </div>
              <div className="flex-shrink-0 ml-4">
                <Badge>Qty: {selected.quantity}</Badge>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
