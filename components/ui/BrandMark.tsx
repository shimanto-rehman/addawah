import { SITE_LOGO_SRC, SITE_NAME } from '@/lib/constants';

export function BrandMark() {
  return (
    <span className="dawa-brand__logo">
      <img src={SITE_LOGO_SRC} alt={`${SITE_NAME} logo`} width={40} height={40} />
    </span>
  );
}
