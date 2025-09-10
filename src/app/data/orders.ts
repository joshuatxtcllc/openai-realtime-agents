export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  orderDate: string;
  completedDate?: string;
  status: 'pending' | 'in_progress' | 'ready_for_pickup' | 'completed' | 'cancelled';
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
  estimatedCompletion?: string;
}

export interface OrderItem {
  id: string;
  description: string;
  frameId?: string;
  mattingId?: string;
  glassId?: string;
  dimensions: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
}

// Sample orders for Jay's Frames
export const sampleOrders: Order[] = [
  {
    id: 'JF-2024-001',
    customerId: 'CUST-001',
    customerName: 'Sarah Johnson',
    customerPhone: '(713) 555-0123',
    customerEmail: 'sarah.johnson@email.com',
    orderDate: '2024-01-15T09:30:00Z',
    completedDate: '2024-01-26T14:00:00Z',
    status: 'ready_for_pickup',
    items: [
      {
        id: 'ITEM-001',
        description: 'Custom Oak Frame with Gold Leaf Accent - 16x20 Family Portrait',
        frameId: 'oak-classic',
        mattingId: 'white-acid-free',
        glassId: 'uv-protection',
        dimensions: '16x20',
        quantity: 1,
        unitPrice: 245,
        totalPrice: 245,
        notes: 'Museum-quality preservation for vintage family photograph'
      }
    ],
    subtotal: 245,
    tax: 0,
    total: 245,
    notes: 'Customer requested museum-quality materials throughout'
  },
  {
    id: 'JF-2024-002',
    customerId: 'CUST-002',
    customerName: 'Michael Chen',
    customerPhone: '(832) 555-0456',
    customerEmail: 'michael.chen@email.com',
    orderDate: '2024-01-20T10:15:00Z',
    status: 'in_progress',
    items: [
      {
        id: 'ITEM-002',
        description: 'Modern Black Metal Frame - 11x14 Diploma',
        frameId: 'black-metal',
        mattingId: 'white-acid-free',
        glassId: 'standard-clear',
        dimensions: '11x14',
        quantity: 1,
        unitPrice: 180,
        totalPrice: 180
      }
    ],
    subtotal: 180,
    tax: 0,
    total: 180,
    estimatedCompletion: '2024-01-30'
  },
  {
    id: 'JF-2024-003',
    customerId: 'CUST-003',
    customerName: 'Emily Rodriguez',
    customerPhone: '(281) 555-0789',
    customerEmail: 'emily.rodriguez@email.com',
    orderDate: '2024-01-22T14:30:00Z',
    status: 'in_progress',
    items: [
      {
        id: 'ITEM-003',
        description: 'Premium Walnut Frame with Museum Glass - 24x36 Artwork',
        frameId: 'walnut-premium',
        mattingId: 'cream-acid-free',
        glassId: 'museum-glass',
        dimensions: '24x36',
        quantity: 1,
        unitPrice: 385,
        totalPrice: 385,
        notes: 'Original oil painting - handle with care'
      }
    ],
    subtotal: 385,
    tax: 0,
    total: 385,
    estimatedCompletion: '2024-02-05',
    notes: 'High-value artwork - extra care required'
  }
];

export const getOrderById = (id: string): Order | undefined => {
  return sampleOrders.find(order => order.id === id);
};

export const getOrdersByPhone = (phone: string): Order[] => {
  return sampleOrders.filter(order => order.customerPhone === phone);
};

export const getOrdersByCustomer = (customerId: string): Order[] => {
  return sampleOrders.filter(order => order.customerId === customerId);
};