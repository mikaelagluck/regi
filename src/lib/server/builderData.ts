import 'server-only';
import type { Tx } from '@/lib/db';
import type { PickerProduct } from '@/components/regimens/types';

export async function pickerProducts(tx: Tx): Promise<PickerProduct[]> {
  return tx.q<PickerProduct>(
    `select p.id, p.brand, p.name, c.step_type::text as step_type, p.state::text as state, p.image_url
       from user_products p join categories c on c.id = p.category_id
      order by p.brand, p.name`,
  );
}
