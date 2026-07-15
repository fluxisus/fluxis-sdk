interface AddressFormatProps {
  address: string;
  boldChars?: number;
}

export function AddressFormat({ address, boldChars = 8 }: AddressFormatProps) {
  const bold: React.CSSProperties = {
    fontWeight: 600,
    color: 'var(--fluxis-color-fg, #0f172a)',
    fontFamily: 'monospace',
  };
  const muted: React.CSSProperties = {
    fontWeight: 400,
    color: 'var(--fluxis-color-muted, #64748b)',
    fontFamily: 'monospace',
  };

  if (address.length <= boldChars * 2) {
    return <span style={bold}>{address}</span>;
  }

  return (
    <>
      <span style={bold}>{address.slice(0, boldChars)}</span>
      <span style={muted}>{address.slice(boldChars, -boldChars)}</span>
      <span style={bold}>{address.slice(-boldChars)}</span>
    </>
  );
}
