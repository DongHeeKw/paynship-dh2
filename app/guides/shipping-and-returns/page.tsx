import { redirect } from 'next/navigation';

// Preserve existing bookmarks while giving the service guide one owner.
export default function ShippingGuideRedirect() {
  redirect('/guides/how-it-works#shipping-and-returns');
}
