import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import { Ride, Driver, User } from "../types";

export function exportRidesToPDF(rides: Ride[], title: string = "Relatorio_Corridas_DriveCash") {
  const doc = new jsPDF();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(11, 19, 41); // Dark Navy #0b1329
  doc.text("DriveCash - Relatório Oficial de Corridas", 14, 20);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, 14, 28);
  doc.text(`Total de Corridas no Relatório: ${rides.length}`, 14, 34);

  let y = 45;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("ID", 14, y);
  doc.text("Passageiro", 40, y);
  doc.text("Motorista", 85, y);
  doc.text("Valor", 130, y);
  doc.text("Status", 165, y);

  doc.line(14, y + 2, 195, y + 2);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  rides.forEach((ride) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    doc.text(ride.id.slice(-6).toUpperCase(), 14, y);
    doc.text((ride.passenger_name || "N/A").slice(0, 20), 40, y);
    doc.text((ride.driver_name || "Buscando...").slice(0, 20), 85, y);
    doc.text(`R$ ${ride.price.toFixed(2)}`, 130, y);
    doc.text(ride.status.toUpperCase(), 165, y);
    y += 7;
  });

  doc.save(`${title}_${Date.now()}.pdf`);
}

export function exportRidesToExcel(rides: Ride[], filename: string = "Relatorio_DriveCash") {
  const data = rides.map((r) => ({
    "ID Corrida": r.id,
    "Passageiro": r.passenger_name,
    "Motorista": r.driver_name || "N/A",
    "Origem": r.origin_address,
    "Destino": r.dest_address,
    "Distância (km)": r.distance_km,
    "Duração (min)": r.duration_mins,
    "Valor (R$)": r.price,
    "DriveCash Gerado": r.drivecash_earned,
    "Status": r.status,
    "Data Criada": new Date(r.created_at).toLocaleString("pt-BR")
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Corridas");
  XLSX.writeFile(workbook, `${filename}_${Date.now()}.xlsx`);
}

export function exportDriversToExcel(drivers: Driver[], users: User[]) {
  const data = drivers.map((d) => {
    const usr = users.find((u) => u.id === d.user_id);
    return {
      "ID Motorista": d.id,
      "Nome": usr?.name || "N/A",
      "Email": usr?.email || "N/A",
      "Telefone": usr?.phone || "N/A",
      "Veículo": d.vehicle_model,
      "Cor": d.vehicle_color,
      "Placa": d.plate,
      "Status": d.status,
      "Aprovação": d.approval_status,
      "Plano Ativo": d.active_plan || "Nenhum",
      "Nota Média": d.rating,
      "Ganhos Mês (R$)": d.earnings_month
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Motoristas");
  XLSX.writeFile(workbook, `Motoristas_DriveCash_${Date.now()}.xlsx`);
}
