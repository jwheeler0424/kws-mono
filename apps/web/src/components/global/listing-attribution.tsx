interface ListingAttributionProps {
  firm: string | null;
  broker: string | null;
  phone: string | null;
  email: string | null;
  buyerFirm: string | null;
  sold: boolean;
  prominence?: 'sm' | 'base' | 'lg';
}

export function ListingAttribution({
  firm,
  broker,
  phone,
  email,
  buyerFirm,
  sold,
  prominence = 'base',
}: ListingAttributionProps) {
  const values = [firm, broker, phone, email].map((value) => value?.trim()).filter(Boolean);
  const textSize = { sm: 'text-sm!', base: 'text-base!', lg: 'text-lg!' }[prominence];

  return (
    <div className={`w-full min-w-0 font-medium text-black [overflow-wrap:anywhere] ${textSize}`}>
      <p className={`m-0! font-medium! text-black! ${textSize}`}>
        Listing Broker: {values.join('; ')}
        {sold && buyerFirm?.trim() ? `; Buyer Brokerage: ${buyerFirm.trim()}` : null}
      </p>
      <p className={`m-0! text-black! ${textSize}`}>Provided by NWMLS</p>
    </div>
  );
}
