import { jsonLd, type JsonLdBase } from './common';

export type FaqItem = {
  question: string;
  answer: string;
};

export function faqPageSchema(items: FaqItem[]): JsonLdBase<'FAQPage'> {
  return jsonLd({
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  });
}
