import { Client, DashboardSummary } from '@/types/dashboard';

export const mockClients: Client[] = [
  {
    id: '1',
    name: 'Acme Construction LLC',
    realmId: '9130347654321',
    qboCompanyName: 'Acme Construction LLC',
    lastReviewDate: new Date('2024-01-15'),
    status: 'green',
    actionItemsCount: 0,
    connectionStatus: 'connected',
    dropboxFolderUrl: 'https://dropbox.com/sh/acme-construction',
    createdAt: new Date('2023-06-01'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: '2',
    name: 'Smith & Associates CPA',
    realmId: '9130347654322',
    qboCompanyName: 'Smith & Associates CPA',
    lastReviewDate: new Date('2024-01-14'),
    status: 'yellow',
    actionItemsCount: 2,
    connectionStatus: 'connected',
    dropboxFolderUrl: 'https://dropbox.com/sh/smith-associates',
    createdAt: new Date('2023-05-15'),
    updatedAt: new Date('2024-01-14'),
  },
  {
    id: '3',
    name: 'Global Tech Solutions',
    realmId: '9130347654323',
    qboCompanyName: 'Global Tech Solutions',
    lastReviewDate: new Date('2024-01-12'),
    status: 'red',
    actionItemsCount: 7,
    connectionStatus: 'disconnected',
    dropboxFolderUrl: 'https://dropbox.com/sh/global-tech',
    createdAt: new Date('2023-04-20'),
    updatedAt: new Date('2024-01-12'),
  },
  {
    id: '4',
    name: 'Riverside Restaurant Group',
    realmId: '9130347654324',
    qboCompanyName: 'Riverside Restaurant Group',
    lastReviewDate: new Date('2024-01-15'),
    status: 'green',
    actionItemsCount: 0,
    connectionStatus: 'connected',
    createdAt: new Date('2023-07-10'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: '5',
    name: 'Metro Healthcare Partners',
    realmId: '9130347654325',
    qboCompanyName: 'Metro Healthcare Partners',
    lastReviewDate: new Date('2024-01-13'),
    status: 'yellow',
    actionItemsCount: 1,
    connectionStatus: 'connected',
    dropboxFolderUrl: 'https://dropbox.com/sh/metro-healthcare',
    createdAt: new Date('2023-08-05'),
    updatedAt: new Date('2024-01-13'),
  },
  {
    id: '6',
    name: 'Blue Mountain Logistics',
    realmId: '9130347654326',
    qboCompanyName: 'Blue Mountain Logistics',
    lastReviewDate: new Date('2024-01-10'),
    status: 'red',
    actionItemsCount: 12,
    connectionStatus: 'disconnected',
    createdAt: new Date('2023-03-15'),
    updatedAt: new Date('2024-01-10'),
  }
];

// Generate additional mock clients to show pagination
export const generateMockClients = (count: number = 100): Client[] => {
  const baseNames = [
    'Advanced Manufacturing Corp', 'Precision Engineering LLC', 'Summit Financial Services',
    'Coastal Property Management', 'Elite Marketing Agency', 'Pioneer Software Solutions',
    'Mountain View Consulting', 'Crystal Clear Cleaning Services', 'Rapid Response Security',
    'Golden Gate Real Estate', 'Innovative Design Studio', 'Strategic Business Partners',
    'Premier Medical Group', 'Dynamic Sales Corporation', 'Excellence Training Institute'
  ];

  const additionalClients: Client[] = [];

  for (let i = 7; i <= count; i++) {
    const name = `${baseNames[i % baseNames.length]} ${Math.floor(i / baseNames.length) + 1}`;
    const statuses: ('green' | 'yellow' | 'red')[] = ['green', 'yellow', 'red'];
    const connectionStatuses: ('connected' | 'disconnected')[] = ['connected', 'disconnected'];
    
    const status = statuses[Math.floor(Math.random() * 3)];
    const actionItems = status === 'green' ? 0 : status === 'yellow' ? Math.floor(Math.random() * 3) + 1 : Math.floor(Math.random() * 10) + 4;
    
    additionalClients.push({
      id: i.toString(),
      name,
      realmId: `91303476543${i.toString().padStart(2, '0')}`,
      qboCompanyName: name,
      lastReviewDate: new Date(2024, 0, Math.floor(Math.random() * 15) + 1),
      status,
      actionItemsCount: actionItems,
      connectionStatus: connectionStatuses[Math.floor(Math.random() * 2)],
      dropboxFolderUrl: Math.random() > 0.3 ? `https://dropbox.com/sh/${name.toLowerCase().replace(/\s+/g, '-')}` : undefined,
      createdAt: new Date(2023, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
      updatedAt: new Date(2024, 0, Math.floor(Math.random() * 15) + 1),
    });
  }

  return [...mockClients, ...additionalClients];
};

export const mockSummary: DashboardSummary = {
  totalClients: 105,
  greenClients: 72,
  yellowClients: 21,
  redClients: 12,
  disconnectedClients: 8,
  nextScheduledRun: new Date('2024-01-15T09:00:00'),
};