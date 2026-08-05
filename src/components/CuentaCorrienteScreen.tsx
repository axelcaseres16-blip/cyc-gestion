import React, { useState } from 'react';
import { Movement, CustomerWithBalance } from '../types';
import { formatDate, formatCurrency } from '../utils/formatters';
import { isMovementFinanciallyActive } from '../utils/movementFinancialState';
import { getPersistedVirtualBoletaImageUrl } from '../utils/virtualBoletaImageStorage';
import { Receipt, Search, Filter, Download, FileText, ArrowUpRight, ArrowDownLeft, SlidersHorizontal, Camera } from 'lucide-react';

interface CuentaCorrienteScreenProps {
  movements: Movement[];
  customers: CustomerWithBalance[];
  onSelectCustomer: (customerId: string) => void;
  onViewImage: (imageUrl: string, title: string) => void;
  currentUserRole?: string;
  onOpenAnularModal?: (mov: Movement) => void;
}

export function buildCuentaCorrienteCsv(movements: Movement[], customers: CustomerWithBalance[]): string {
  const escapeCsv = (value: string | number | undefined) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  let csv = 'ID,Fecha,Cliente,Tipo,NumeroBoleta,Debito_Suma,Credito_Resta,MetodoPago,RegistradoPor,Descripcion,Estado,FechaAnulacion,MotivoAnulacion,UsuarioAnulo\n';

  movements.forEach((m) => {
    const cust = customers.find((c) => c.id === m.customerId);
    const nombreCliente = cust ? cust.alias || cust.nombre : 'Desconocido';
    const debito = m.esDebito ? m.monto : 0;
    const credito = !m.esDebito ? m.monto : 0;
    const estado = m.anulacionEnProceso ? 'Anulación en proceso' : m.isAnulado ? 'Anulado' : 'Activo';

    csv += [
      m.id,
      formatDate(m.fecha, true),
      nombreCliente,
      m.tipo,
      m.numeroBoleta,
      debito,
      credito,
      m.metodoPago,
      m.registradoPor,
      m.descripcion,
      estado,
      m.anuladoAt ? formatDate(m.anuladoAt, true) : '',
      m.motivoAnulacion,
      m.anuladoPor,
    ].map(escapeCsv).join(',') + '\n';
  });

  return csv;
}

export const CuentaCorrienteScreen: React.FC<CuentaCorrienteScreenProps> = ({
  movements,
  customers,
  onSelectCustomer,
  onViewImage,
  currentUserRole,
  onOpenAnularModal,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTipo, setSelectedTipo] = useState('TODOS');
  const [selectedCustomerId, setSelectedCustomerId] = useState('TODOS');

  const handleViewMovementImage = async (movement: Movement) => {
    const imageUrl = movement.imageId
      ? await getPersistedVirtualBoletaImageUrl(movement.imageId)
      : movement.fotoUrl;
    if (imageUrl) onViewImage(imageUrl, `Boleta ${movement.numeroBoleta || ''}`);
  };

  const filteredMovements = movements.filter((m) => {
    const cust = customers.find((c) => c.id === m.customerId);
    const term = searchTerm.toLowerCase();

    const matchesSearch =
      (m.numeroBoleta && m.numeroBoleta.toLowerCase().includes(term)) ||
      (m.descripcion && m.descripcion.toLowerCase().includes(term)) ||
      (cust && (cust.nombre.toLowerCase().includes(term) || cust.alias.toLowerCase().includes(term)));

    const matchesTipo = selectedTipo === 'TODOS' || m.tipo === selectedTipo;
    const matchesCust = selectedCustomerId === 'TODOS' || m.customerId === selectedCustomerId;

    return matchesSearch && matchesTipo && matchesCust;
  });

  const activeFilteredMovements = filteredMovements.filter(isMovementFinanciallyActive);

  const totalDebitosSum = activeFilteredMovements
    .filter((m) => m.esDebito)
    .reduce((acc, m) => acc + m.monto, 0);

  const totalCreditosSum = activeFilteredMovements
    .filter((m) => !m.esDebito)
    .reduce((acc, m) => acc + m.monto, 0);

  // Función para exportar a CSV
  const handleExportCSV = () => {
    const csv = buildCuentaCorrienteCsv(filteredMovements, customers);

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `CuentaCorriente_CyC_Gestion_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="cuenta-corriente-screen-container" className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
            <Receipt className="w-6 h-6 text-blue-600" />
            <span>Libro Diario & Cuenta Corriente Global</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Registro auditable e inmutable de todos los movimientos (Boletas, Pagos y Ajustes)
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-xs transition flex items-center justify-center space-x-2"
        >
          <Download className="w-4 h-4" />
          <span>Exportar Planilla CSV</span>
        </button>
      </div>

      {/* Tarjetas de Balance Filtrado */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200">
          <p className="text-xs font-bold uppercase text-slate-500">Total Boletas / Débitos (+)</p>
          <p className="text-xl font-black font-mono text-red-600 mt-1">
            {formatCurrency(totalDebitosSum)}
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200">
          <p className="text-xs font-bold uppercase text-slate-500">Total Pagos / Créditos (-)</p>
          <p className="text-xl font-black font-mono text-emerald-600 mt-1">
            {formatCurrency(totalCreditosSum)}
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200">
          <p className="text-xs font-bold uppercase text-slate-500">Diferencia Neta Filtrada</p>
          <p className={`text-xl font-black font-mono mt-1 ${totalDebitosSum - totalCreditosSum >= 0 ? 'text-slate-900' : 'text-emerald-600'}`}>
            {formatCurrency(totalDebitosSum - totalCreditosSum)}
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por N° Boleta, Detalle..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
            />
          </div>

          <div>
            <select
              value={selectedTipo}
              onChange={(e) => setSelectedTipo(e.target.value)}
              className="w-full py-1.5 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
            >
              <option value="TODOS">📄 Todos los Tipos de Movimiento</option>
              <option value="BOLETA">🔴 Solo Boletas (Ventas)</option>
              <option value="PAGO">🟢 Solo Pagos (Cobranzas)</option>
              <option value="AJUSTE">⚖️ Solo Ajustes de Saldo</option>
              <option value="SALDO_INICIAL">📌 Solo Saldos Iniciales</option>
            </select>
          </div>

          <div>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full py-1.5 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
            >
              <option value="TODOS">👥 Todos los Clientes</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.alias || c.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Lista de Movimientos */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="divide-y divide-slate-100">
          {filteredMovements.map((mov) => {
            const cust = customers.find((c) => c.id === mov.customerId);
            const isDebito = mov.esDebito;

            return (
              <div
                key={mov.id}
                className={`p-4 hover:bg-slate-50 transition flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                  mov.isAnulado ? 'bg-red-50/40 opacity-75' : mov.anulacionEnProceso ? 'bg-amber-50/50 opacity-75' : ''
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div
                    className={`p-2.5 rounded-xl text-xs font-bold shrink-0 mt-0.5 ${
                      mov.isAnulado
                        ? 'bg-slate-200 text-slate-500 line-through'
                        : mov.anulacionEnProceso
                        ? 'bg-amber-100 text-amber-700'
                        : isDebito
                        ? 'bg-red-100 text-red-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {isDebito ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center space-x-2 flex-wrap gap-1">
                      <span
                        className="font-extrabold text-sm text-slate-900 hover:text-blue-600 transition cursor-pointer"
                        onClick={() => cust && onSelectCustomer(cust.id)}
                      >
                        {cust ? cust.alias || cust.nombre : 'Cliente'}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                        {mov.tipo}
                      </span>
                      {mov.isAnulado && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-red-600 text-white shadow-2xs">
                          🚨 ANULADO
                        </span>
                      )}
                      {mov.anulacionEnProceso && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 shadow-2xs">
                          ANULACIÓN EN PROCESO
                        </span>
                      )}
                      <span className="text-xs text-slate-500">{formatDate(mov.fecha, true)}</span>
                    </div>

                    <p className={`text-xs font-medium ${mov.isAnulado ? 'line-through text-slate-400' : 'text-slate-600'}`}>
                      {mov.tipo === 'BOLETA' ? `Boleta N° ${mov.numeroBoleta}` : mov.descripcion}
                    </p>

                    <div className="flex items-center space-x-3 text-[11px] text-slate-400 flex-wrap">
                      <span>Registrado por: <strong>{mov.registradoPor}</strong></span>
                      {mov.isAnulado && (
                        <span className="text-red-600 font-bold">
                          Anulado por: {mov.anuladoPor} ({mov.motivoAnulacion})
                        </span>
                      )}
                      {mov.comprobantePago && <span>Ref: {mov.comprobantePago}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end space-x-3 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                  {(mov.fotoUrl || mov.imageId) && (
                    <button
                      onClick={() => handleViewMovementImage(mov)}
                      className="flex items-center space-x-1 bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold px-2.5 py-1.5 rounded-lg border border-slate-300 transition"
                    >
                      <Camera className="w-3.5 h-3.5 text-blue-600" />
                      <span>Ver comprobante</span>
                    </button>
                  )}

                  {!mov.isAnulado && !mov.anulacionEnProceso && currentUserRole !== 'REPARTIDOR' && onOpenAnularModal && (
                    <button
                      onClick={() => onOpenAnularModal(mov)}
                      className="text-[11px] font-extrabold text-red-600 hover:text-white bg-red-50 hover:bg-red-600 border border-red-200 px-2.5 py-1.5 rounded-lg transition active:scale-95 cursor-pointer"
                      title="Anular movimiento (Proceso seguro inmutable)"
                    >
                      Anular
                    </button>
                  )}

                  <div className="text-right">
                    <span
                      className={`text-base font-black font-mono ${
                        mov.isAnulado
                          ? 'line-through text-slate-400'
                          : isDebito
                          ? 'text-red-600'
                          : 'text-emerald-600'
                      }`}
                    >
                      {isDebito ? '+' : '-'}{formatCurrency(mov.monto)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
