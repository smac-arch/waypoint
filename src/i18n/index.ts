import de from './de.json';
import en from './en.json';
import fr from './fr.json';
import nl from './nl.json';

type TranslationKey = keyof typeof en;
export type Locale = 'en' | 'nl' | 'de' | 'fr';

const translations: Record<Locale, Record<TranslationKey, string>> = {
  en,
  nl,
  de,
  fr,
};

export function translate(
  locale: Locale,
  key: TranslationKey,
  values?: { sequence?: number },
): string {
  const message = translations[locale][key];
  return values?.sequence === undefined
    ? message
    : message.replace('{{sequence}}', String(values.sequence));
}
