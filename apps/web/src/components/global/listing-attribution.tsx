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
  const firmName = firm?.trim();
  const brokerName = broker?.trim();
  const contactPhone = phone?.trim();
  const contactEmail = email?.trim();
  const buyerFirmName = sold ? buyerFirm?.trim() : undefined;
  const textSize = {
    sm: 'text-sm! leading-5!',
    base: 'text-base! leading-6!',
    lg: 'text-lg! leading-7!',
  }[prominence];

  return (
    <div
      className={`w-full min-w-0 space-y-1.5 wrap-anywhere text-left font-sans text-black ${textSize}`}>
      <p className={`m-0! font-normal! text-black! ${textSize}`}>
        <span className='block max-w-full wrap-anywhere whitespace-normal leading-tight font-semibold'>
          Listing Broker: {firmName}
        </span>
        {buyerFirmName ? <span className='block'>Buyer Brokerage: {buyerFirmName}</span> : null}
        {brokerName ? <span className='block'>{brokerName}</span> : null}
        {contactPhone ? <span className='block'>{contactPhone}</span> : null}
        {contactEmail ? <span className='block'>{contactEmail}</span> : null}
      </p>
      <p className='m-0! text-xs! leading-4! font-normal! text-neutral-600!'>Provided by NWMLS</p>
    </div>
  );
}
