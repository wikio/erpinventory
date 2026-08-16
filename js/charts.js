/**
 * SARI Système - Chart.js Analytics Suite
 * Interactive charts for Inventory Movement, Monthly Sales,
 * Category Distribution, Import vs Local Sourcing, and Tender Pipeline.
 */

class SariCharts {
  constructor() {
    this.charts = {};
  }

  destroyChart(id) {
    if (this.charts[id]) {
      this.charts[id].destroy();
      delete this.charts[id];
    }
  }

  getFontFamily() {
    return "'Plus Jakarta Sans', 'IBM Plex Sans Arabic', sans-serif";
  }

  getTextColor() {
    const isDark = document.body.classList.contains('theme-dark');
    return isDark ? '#94A3B8' : '#475569';
  }

  getGridColor() {
    const isDark = document.body.classList.contains('theme-dark');
    return isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
  }

  /**
   * 1. Inventory movement chart (stock in/out over time)
   */
  renderInventoryMovement(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    this.destroyChart(canvasId);

    const labels = ['Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août'];
    const dataIn = [420, 580, 510, 690, 840, 920];
    const dataOut = [380, 520, 480, 610, 780, 860];

    this.charts[canvasId] = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Entrées Stock (Pcs/Btes)',
            data: dataIn,
            borderColor: '#009CC5',
            backgroundColor: 'rgba(0, 156, 197, 0.12)',
            borderWidth: 3,
            fill: true,
            tension: 0.3,
            pointBackgroundColor: '#009CC5',
            pointBorderColor: '#FFFFFF',
            pointRadius: 4
          },
          {
            label: 'Sorties Stock (Livraisons)',
            data: dataOut,
            borderColor: '#C6DA34',
            backgroundColor: 'rgba(198, 218, 52, 0.12)',
            borderWidth: 3,
            fill: true,
            tension: 0.3,
            pointBackgroundColor: '#C6DA34',
            pointBorderColor: '#FFFFFF',
            pointRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: this.getTextColor(),
              font: { family: this.getFontFamily(), weight: '600' }
            }
          }
        },
        scales: {
          x: {
            grid: { color: this.getGridColor() },
            ticks: { color: this.getTextColor(), font: { family: this.getFontFamily() } }
          },
          y: {
            grid: { color: this.getGridColor() },
            ticks: { color: this.getTextColor(), font: { family: this.getFontFamily() } }
          }
        }
      }
    });
  }

  /**
   * 2. Monthly sales chart (in Algerian Dinars DZD)
   */
  renderMonthlySales(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    this.destroyChart(canvasId);

    const labels = ['Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août'];
    const dataSales = [2.4, 3.1, 2.9, 4.2, 5.8, 6.4]; // in Millions DZD

    this.charts[canvasId] = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Chiffre d\'Affaires (Millions DA)',
            data: dataSales,
            backgroundColor: '#009CC5',
            hoverBackgroundColor: '#007D9E',
            borderColor: '#C6DA34',
            borderWidth: { top: 3, left: 0, right: 0, bottom: 0 },
            borderRadius: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: (context) => `${context.parsed.y} Millions DA`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: this.getTextColor(), font: { family: this.getFontFamily() } }
          },
          y: {
            grid: { color: this.getGridColor() },
            ticks: {
              color: this.getTextColor(),
              font: { family: this.getFontFamily() },
              callback: (val) => `${val} M DA`
            }
          }
        }
      }
    });
  }

  /**
   * 3. Product category distribution (equipment / consumables / PPE / etc.)
   */
  renderCategoryDistribution(canvasId, categoryCounts = null) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    this.destroyChart(canvasId);

    const labels = [
      'Équipement Diagnostic',
      'Consommables Médicaux',
      'Mobilier Hospitalier',
      'Stérilisation & Lab',
      'EPI & Protection',
      'Chirurgie & Pharm.'
    ];
    const data = categoryCounts || [25, 40, 12, 10, 18, 15];

    this.charts[canvasId] = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [
          {
            data,
            backgroundColor: [
              '#009CC5', // Sari Blue
              '#C6DA34', // Sari Lime
              '#EBB51A', // Sari Amber
              '#38BDF8', // Sky Blue accent
              '#A3E635', // Lime light accent
              '#F59E0B'  // Amber dark accent
            ],
            borderColor: '#FFFFFF',
            borderWidth: 2,
            hoverOffset: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: this.getTextColor(),
              font: { family: this.getFontFamily(), size: 11 },
              boxWidth: 12
            }
          }
        }
      }
    });
  }

  /**
   * 4. Import vs. local supply ratio
   */
  renderImportRatio(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    this.destroyChart(canvasId);

    this.charts[canvasId] = new Chart(canvas, {
      type: 'pie',
      data: {
        labels: ['Importations (International)', 'Sourcing Local Algérie'],
        datasets: [
          {
            data: [68, 32],
            backgroundColor: ['#009CC5', '#C6DA34'],
            borderColor: '#FFFFFF',
            borderWidth: 2,
            hoverOffset: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: this.getTextColor(),
              font: { family: this.getFontFamily(), weight: '600' }
            }
          }
        }
      }
    });
  }

  /**
   * 5. Tender win/loss ratio and pipeline value
   */
  renderTenderPipeline(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    this.destroyChart(canvasId);

    this.charts[canvasId] = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: ['En Préparation', 'Soumission Déposée', 'En Évaluation', 'Attribué (Gagné)', 'Non Retenu (Perdu)'],
        datasets: [
          {
            label: 'Nombre d\'Appels d\'Offres',
            data: [3, 4, 2, 6, 2],
            backgroundColor: [
              '#38BDF8',
              '#EBB51A',
              '#A855F7',
              '#C6DA34', // Won = Green
              '#EF4444'  // Lost = Red
            ],
            borderRadius: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: this.getTextColor(), font: { family: this.getFontFamily(), size: 11 } }
          },
          y: {
            grid: { color: this.getGridColor() },
            ticks: { color: this.getTextColor(), font: { family: this.getFontFamily() } }
          }
        }
      }
    });
  }
}

const sariCharts = new SariCharts();
if (typeof window !== 'undefined') {
  window.sariCharts = sariCharts;
}

export {};
