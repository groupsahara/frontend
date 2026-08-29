/**
 * When the admin is done talking.
 *
 * The analyst keeps the mic open after every answer, so something has to end
 * the conversation. That something is the admin saying so — "sleep now", "no
 * thank you", "bas" — in English, Hindi or Hinglish, and nothing else: closing
 * on a guess would cut off a question mid-sentence, which is far worse than one
 * extra "anything else?". Once closed, only two claps wake it again.
 */

/**
 * Ways of saying "we're done", across the three languages admins use here.
 *
 * "sleep now" is the explicit one — it puts the analyst back to sleep and hands
 * the dashboard back.
 *
 * The Devanagari spellings matter as much as the Roman ones: recognition runs
 * in hi-IN after a Hindi answer, and Chrome then transcribes English speech
 * into Devanagari — "sleep now" comes back as "स्लीप नाउ", not "sleep now".
 */
const SIGN_OFF =
  /(sleep now|go to sleep|sleep|slip|so jao|so jaao|sojao|सो जाओ|सो जाइए|सो जा|स्लीप|स्लिप|no thank you|no thanks|nothing else|that'?s all|that is all|thats all|i'?m done|im done|we'?re done|all good|goodbye|bye|stop|kuchh? nahi|kuchh? nahin|nahi chahiye|nahin chahiye|band karo|bandh karo|bas|bass|bas itna|dhanyav?ad|dhanyawad|shukriya|thank you|thanks|कुछ नहीं|नहीं चाहिए|बस|धन्यवाद|शुक्रिया|बंद करो|बंद कर|रुको|रुक जाओ|चुप हो जाओ|थैंक यू|थैंक्यू|थैंक्स|नो थैंक|बाय|स्टॉप|गुड बाय)/i;

/**
 * Words that make an utterance a question, whatever else it contains.
 *
 * These veto a sign-off, so "thank you, ab pichle mahine ka batao" keeps the
 * conversation open instead of ending it on the "thank you".
 */
const STILL_ASKING =
  /(kya|kaisa|kaise|kitna|kitne|kitni|batao|bataiye|dikhao|dikhaiye|what|how|which|who|show|give|tell|revenue|booking|sales|lead|customer|report|month|week|data|aur|zyada|jyada|क्या|कैसे|कितना|कितने|बताओ|दिखाओ|रेवेन्यू|बुकिंग|रिपोर्ट)/i;

/**
 * True when this utterance ends the conversation.
 *
 * A sign-off is short and asks for nothing: "sleep now", "no thank you", "बस".
 * The moment it also carries a question it is a follow-up, not a goodbye.
 */
export function isSignOff(said: string): boolean {
  const text = said
    .trim()
    .toLowerCase()
    .replace(/[.,!?।]/g, "");
  if (!text) return false;

  const words = text.split(/\s+/);
  // Anything long enough to carry a question is treated as one.
  if (words.length > 6) return false;
  if (STILL_ASKING.test(text)) return false;
  if (text === "no" || text === "nahi" || text === "nahin" || text === "नहीं") return true;
  return SIGN_OFF.test(text);
}

/** Letters, digits and Devanagari only — ASR punctuation and spacing vary. */
const squash = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\u0900-\u097F]+/g, "");

/**
 * True when a transcript is just the analyst's own voice coming back.
 *
 * The microphone hears the answer through the speakers, and recognition will
 * happily transcribe it — which reads as the admin interrupting with her own
 * words. If what was "heard" is already inside what she just said, it is echo.
 */
export function isEchoOfAnswer(said: string, answerSoFar: string): boolean {
  const heard = squash(said);
  // Too short to attribute either way: "haan", "ok" are as likely to be real.
  if (heard.length < 8) return false;
  return squash(answerSoFar).includes(heard);
}
