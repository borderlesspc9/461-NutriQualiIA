// Non-conformity detection engine for food safety parameters (RDC 216)

export type FoodCategory = 'cold_salad' | 'cold_dessert' | 'cold_dairy' | 'cold_other' | 'fruit' | 'hot' | 'beverage';

export interface FoodItem {
  id: string;
  name: string;
  category: FoodCategory;
  sample: boolean | null; // null = not checked
  startTime: string;
  startTemp: string;
  endTime: string;
  endTemp: string;
}

export interface NonConformity {
  id: string;
  foodItemId: string;
  foodItemName: string;
  field: 'startTemp' | 'endTemp' | 'startTime' | 'endTime' | 'blank' | 'blank_name';
  value: string;
  message: string;
  correctiveAction: string | null; // null for blank fields
  resolved: boolean;
  appliedAction: string | null;
}

export interface SpreadsheetData {
  id: string;
  unit: string;
  responsible: string;
  role: string;
  date: string;
  items: FoodItem[];
  nonConformities: NonConformity[];
  finalized: boolean;
}

// Temperature limits
const COLD_MAX = 10; // °C - salads, desserts, dairy, cold items
const FRUIT_MIN = 10;
const FRUIT_MAX = 21;
const HOT_MIN = 60; // °C

function getTempLimit(category: FoodCategory): { min?: number; max?: number } {
  switch (category) {
    case 'cold_salad':
    case 'cold_dessert':
    case 'cold_dairy':
    case 'cold_other':
      return { max: COLD_MAX };
    case 'fruit':
      return { max: FRUIT_MAX };
    case 'hot':
      return { min: HOT_MIN };
    case 'beverage':
      return { max: COLD_MAX };
    default:
      return {};
  }
}

function getCorrectiveAction(category: FoodCategory, field: string, value: number): string {
  if (category === 'fruit') {
    return `A fruta atingiu temperatura de ${value}°C, acima do limite superior (${FRUIT_MAX}°C). Ação: Refrigerar imediatamente ou descartar conforme POP, em conformidade com a RDC 216.`;
  }
  if (category === 'hot') {
    return `Alimento quente atingiu ${value}°C, abaixo do mínimo (${HOT_MIN}°C). Ação: Reaquecer imediatamente a ≥70°C ou descartar conforme POP, em conformidade com a RDC 216.`;
  }
  // Cold items
  return `Alimento atingiu temperatura de ${value}°C, acima do limite máximo (${COLD_MAX}°C). Ação: Produto descartado conforme POP, em conformidade com a RDC 216.`;
}

export function detectNonConformities(items: FoodItem[]): NonConformity[] {
  const ncs: NonConformity[] = [];
  let ncId = 0;

  items.forEach((item) => {
    const limits = getTempLimit(item.category);
    const fieldsToCheck: Array<{ field: 'startTemp' | 'endTemp'; label: string }> = [
      { field: 'startTemp', label: 'início da distribuição' },
      { field: 'endTemp', label: 'após 1 hora do início da distribuição' },
    ];

    // Check blank name (preparation not filled)
    const nameParts = item.name.split(':');
    const prepName = nameParts.length > 1 ? nameParts.slice(1).join(':').trim() : '';
    if (!prepName) {
      ncs.push({
        id: `nc-${++ncId}`,
        foodItemId: item.id,
        foodItemName: item.name,
        field: 'blank_name',
        value: '',
        message: `Preparação não informada para ${nameParts[0]}`,
        correctiveAction: null,
        resolved: false,
        appliedAction: null,
      });
    }

    // Check blank fields (except sample)
    const blankFields: Array<{ field: 'startTime' | 'endTime' | 'startTemp' | 'endTemp'; label: string }> = [
      { field: 'startTime', label: 'Horário início' },
      { field: 'startTemp', label: 'Temperatura início' },
      { field: 'endTime', label: 'Horário após 1h' },
      { field: 'endTemp', label: 'Temperatura após 1h' },
    ];

    blankFields.forEach(({ field, label }) => {
      const val = item[field]?.toString().trim();
      if (!val || val === '' || val === '0' || val === '0.0') {
        // Only flag as blank if truly empty
        if (!val || val === '') {
          ncs.push({
            id: `nc-${++ncId}`,
            foodItemId: item.id,
            foodItemName: item.name,
            field: 'blank',
            value: '',
            message: `Campo "${label}" em branco para ${item.name}`,
            correctiveAction: null,
            resolved: false,
            appliedAction: null,
          });
        }
      }
    });

    // Check temperature values
    fieldsToCheck.forEach(({ field, label }) => {
      const raw = item[field]?.toString().trim();
      if (!raw || raw === '') return; // Already flagged as blank
      const temp = parseFloat(raw);
      if (isNaN(temp)) return;

      let isNC = false;
      if (limits.max !== undefined && temp > limits.max) isNC = true;
      if (limits.min !== undefined && temp < limits.min) isNC = true;

      if (isNC) {
        ncs.push({
          id: `nc-${++ncId}`,
          foodItemId: item.id,
          foodItemName: item.name,
          field,
          value: raw,
          message: `Temperatura fora do padrão no ${label}: ${temp}°C (${item.name})`,
          correctiveAction: getCorrectiveAction(item.category, field, temp),
          resolved: false,
          appliedAction: null,
        });
      }
    });
  });

  return ncs;
}

export function getDefaultLunchItems(): FoodItem[] {
  return [
    { id: '1', name: 'Salada 1:', category: 'cold_salad', sample: null, startTime: '', startTemp: '', endTime: '', endTemp: '' },
    { id: '2', name: 'Salada 2:', category: 'cold_salad', sample: null, startTime: '', startTemp: '', endTime: '', endTemp: '' },
    { id: '3', name: 'Salada 3:', category: 'cold_salad', sample: null, startTime: '', startTemp: '', endTime: '', endTemp: '' },
    { id: '4', name: 'Sobremesa:', category: 'cold_dessert', sample: null, startTime: '', startTemp: '', endTime: '', endTemp: '' },
    { id: '5', name: 'Sobremesa Diet:', category: 'cold_dessert', sample: null, startTime: '', startTemp: '', endTime: '', endTemp: '' },
    { id: '6', name: 'Frutas:', category: 'fruit', sample: null, startTime: '', startTemp: '', endTime: '', endTemp: '' },
    { id: '7', name: 'Suco Refresqueira 1:', category: 'beverage', sample: null, startTime: '', startTemp: '', endTime: '', endTemp: '' },
    { id: '8', name: 'Suco Refresqueira 2:', category: 'beverage', sample: null, startTime: '', startTemp: '', endTime: '', endTemp: '' },
  ];
}
