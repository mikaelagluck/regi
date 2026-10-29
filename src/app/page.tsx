import { redirect } from 'next/navigation';

/** B1.2: the app always opens to Today. */
export default function Home() {
  redirect('/today');
}
