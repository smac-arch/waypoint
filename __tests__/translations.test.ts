import de from '../src/i18n/de.json';
import en from '../src/i18n/en.json';
import fr from '../src/i18n/fr.json';
import nl from '../src/i18n/nl.json';

const translations = { en, nl, de, fr };
const englishKeys = Object.keys(en).sort();

it.each(Object.entries(translations))(
  '%s contains every English translation key',
  (_locale, translation) => {
    expect(Object.keys(translation).sort()).toEqual(englishKeys);
    expect(Object.values(translation).every((value) => value.length > 0)).toBe(
      true,
    );
  },
);
