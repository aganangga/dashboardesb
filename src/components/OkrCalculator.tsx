import { useState } from 'react';

const metrics = [
  { label: 'Tiket H+0', weight: 25, target: 100 },
  { label: 'Send Mail Omni H+1', weight: 25, target: 100 },
  { label: 'CSAT Go App', weight: 10, target: 5 },
  { label: 'CSAT Omni', weight: 10, target: 5 },
  { label: 'Check-in Omni H+0', weight: 10, target: 100 },
  { label: 'Check-out Omni H+0', weight: 10, target: 100 },
  { label: 'FAQ', weight: 10, target: 6 },
];
const yogaExample = ['100', '94', '4,74', '4,6', '100', '100', '9'];
const format = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 });
const blankValues = () => metrics.map(() => '');

export function OkrCalculator() {
  const [values, setValues] = useState(blankValues);
  const points = metrics.map(({ weight, target }, index) => {
    const input = values[index].trim();
    const value = Number(input.replace(',', '.'));
    return /^\d+(?:[,.]\d+)?$/.test(input) && Number.isFinite(value)
      ? Math.round(value / target * weight * 100) / 100
      : null;
  });
  const total = points.every(point => point !== null)
    ? points.reduce<number>((sum, point) => sum + (point ?? 0), 0)
    : null;
  return <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-lg font-semibold">Simulasi OKR</h2>
      <div className="flex gap-3 text-sm">
        <button className="rounded-lg border px-3 py-2" onClick={() => setValues(yogaExample)}>Isi contoh Yoga</button>
        <button className="rounded-lg border px-3 py-2" onClick={() => setValues(blankValues())}>Kosongkan</button>
      </div>
    </div>
    <p className="text-sm text-slate-600">Isi realisasi secara manual. Poin OKR = realisasi ÷ target × bobot. Poin dapat melebihi bobot.</p>
    <div className="overflow-x-auto"><table className="w-full text-left text-sm">
      <thead className="bg-slate-50"><tr>{['KPI', 'Bobot', 'Realisasi', 'Target', 'Poin OKR'].map(label => <th key={label} scope="col" className="p-2">{label}</th>)}</tr></thead>
      <tbody>{metrics.map(({ label, weight, target }, index) => <tr key={label} className="border-t border-slate-100">
        <th scope="row" className="p-2 font-medium">{label}</th>
        <td className="p-2">{weight}%</td>
        <td className="p-2"><input aria-label={'Realisasi ' + label} inputMode="decimal" className="w-24 rounded border p-2" value={values[index]} onChange={event => { const value = event.target.value; setValues(previous => previous.map((old, i) => i === index ? value : old)); }} /></td>
        <td className="p-2">{target}</td>
        <td className="p-2">{points[index] === null ? '—' : format.format(points[index]!) + '%'}</td>
      </tr>)}</tbody>
      <tfoot><tr className="border-t font-semibold"><th scope="row" className="p-2">Total pencapaian</th><td className="p-2">100%</td><td colSpan={2}/><td className="p-2">{total === null ? '—' : format.format(total) + '%'}</td></tr></tfoot>
    </table></div>
  </section>;
}
