const exportarPDF = async () => {
    setExportando(true);
    try {
      const doc = new jsPDF("landscape");
      const logoData = await getBase64ImageFromUrl("/logo.png");
      
      const pesoStatus: Record<string, number> = { "CONCLUÍDO": 1, "ANDAMENTO": 2, "AGUARDANDO": 3, "BACKLOG": 4 };

      // ORDENAÇÃO: Agrupamento padrão por Responsável, seguido pelo Status e Data
      const dadosOrdenados = [...cards].sort((a, b) => {
        // 1. Agrupamento por Responsável
        const respA = a.responsavel_nome || "Sem Responsável";
        const respB = b.responsavel_nome || "Sem Responsável";
        if (respA < respB) return -1;
        if (respA > respB) return 1;
        
        // 2. Status
        const stA = (a.kanban_colunas?.status_global || 'BACKLOG').toUpperCase();
        const stB = (b.kanban_colunas?.status_global || 'BACKLOG').toUpperCase();
        const ordemA = pesoStatus[stA] || 99;
        const ordemB = pesoStatus[stB] || 99;
        if (ordemA !== ordemB) return ordemA - ordemB;
        
        // 3. Vencimento
        return new Date(a.data_vencimento || 0).getTime() - new Date(b.data_vencimento || 0).getTime();
      });

      const tableColumn = ["Etapa/Coluna", "Título", "Prioridade", "Vencimento", "Workflow", "Status Global", "Resumo/Descrição"];
      const tableRows: any[] = [];
      let grupoAtual = null;

      dadosOrdenados.forEach(item => {
        let valGrupo = item.responsavel_nome || "Sem Responsável";

        if (valGrupo !== grupoAtual) {
          tableRows.push([{
            content: `Responsável: ${valGrupo}`, colSpan: 7, 
            styles: { fillColor: [226, 232, 240], textColor: [15, 23, 42], fontStyle: 'bold', halign: 'left' }
          }]);
          grupoAtual = valGrupo;
        }
        
        tableRows.push([
          item.kanban_colunas?.nome || "-", 
          item.titulo || "-",
          item.prioridade || "-",
          formatarData(item.data_vencimento), 
          item.kanban_workflows?.nome || "-", 
          item.kanban_colunas?.status_global || "-", 
          item.descricao || "-"
        ]);
      });

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 40,
        margin: { top: 40, bottom: 40, left: 14, right: 14 },
        theme: 'grid', 
        styles: { font: 'helvetica', fontSize: 7.5, cellPadding: 2, overflow: 'linebreak', lineColor: [200, 200, 200], lineWidth: 0.1 },
        columnStyles: { 
          0: { cellWidth: 30 }, 
          1: { cellWidth: 45 }, 
          2: { cellWidth: 20, halign: 'center' }, 
          3: { cellWidth: 20, halign: 'center' }, 
          4: { cellWidth: 30 }, 
          5: { cellWidth: 25, halign: 'center' }, 
          6: { cellWidth: 'auto', halign: 'left' } 
        },
        headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        
        didDrawPage: function (data) {
          const pageWidth = doc.internal.pageSize.getWidth();
          const pageHeight = doc.internal.pageSize.getHeight();

          // Caixas de blindagem
          doc.setFillColor(255, 255, 255);
          doc.rect(0, 0, pageWidth, 38, "F"); 
          doc.rect(0, pageHeight - 35, pageWidth, 35, "F");

          // --- CABEÇALHO ---
          if (logoData) {
            doc.addImage(logoData, "PNG", 14, 10, 40, 15);
          }
          
          doc.setFont("helvetica", "bold");
          doc.setFontSize(16);
          doc.setTextColor(0, 0, 0);
          doc.text("Agenda Kanban TC Copiadoras", pageWidth / 2, 20, { align: "center" });

          doc.setDrawColor(200, 200, 200);
          doc.setLineWidth(0.5);
          doc.line(14, 28, pageWidth - 14, 28);

          // --- DATA ---
          const today = new Date();
          const dia = String(today.getDate()).padStart(2, '0');
          const meses = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
          const textoData = `Belém, ${dia} de ${meses[today.getMonth()]} de ${today.getFullYear()}.`;
          
          doc.setFont("helvetica", "italic");
          doc.setFontSize(9);
          doc.setTextColor(100, 100, 100);
          doc.text(textoData, pageWidth - 14, 25, { align: "right" });

          // --- RODAPÉ PRETO ---
          doc.setFillColor(0, 0, 0); 
          doc.rect(0, pageHeight - 25, pageWidth, 25, "F");

          doc.setFont("helvetica", "normal");
          doc.setFontSize(7.5);
          doc.setTextColor(255, 255, 255);

          const textoRodapeEsq = "Av. Gov. José Malcher, 2266.\nSão Brás, Belém - PA. CEP: 66060-232\n\nCNPJ: 07.679.989/0001-50 | I.E.: 15.250.057-0";
          doc.text(textoRodapeEsq, 14, pageHeight - 16);

          const textoRodapeDir = "(91) 988159-2777\n(91) 3366-5100\nequipetc@tccopiadoras.com.br";
          doc.text(textoRodapeDir, pageWidth - 14, pageHeight - 16, { align: "right" });
        },
        
        didParseCell: function (data) {
          if (data.section === 'body' && data.column.index === 5 && data.cell.raw) {
            const status = String(data.cell.raw).toUpperCase();
            if (status === 'CONCLUÍDO') { data.cell.styles.textColor = [21, 128, 61]; data.cell.styles.fontStyle = 'bold'; } 
            else if (status === 'AGUARDANDO') { data.cell.styles.textColor = [161, 98, 7]; data.cell.styles.fontStyle = 'bold'; } 
            else if (status === 'ANDAMENTO') { data.cell.styles.textColor = [29, 78, 216]; data.cell.styles.fontStyle = 'bold'; }
          }
        }
      });
      doc.save("Agenda_Kanban_TC_Copiadoras.pdf");
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      alert("Erro ao gerar PDF.");
    } finally {
      setExportando(false);
    }
  };