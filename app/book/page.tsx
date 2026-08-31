import { redirect } from "next/navigation";

/**
 * The WhatsApp "Book now" landing URL, for people without the app.
 *
 * On Android with the app installed this URL never reaches the website —
 * the App Link intent filter takes it. Everyone else lands here and is sent
 * into the normal web booking flow.
 */
export default function BookPage() {
  // Straight to the services grid rather than the top of the landing page —
  // the customer tapped "Book now", so scrolling to find services is friction.
  redirect("/#services");
}
