import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { ModuleItem } from '../config/modules';
import * as Api from '../api';
import { useDebounce } from '../hooks/useDebounce';

function getApiClient(key: string) {
  const pascal = key.split('-').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('');
  return (Api as any)[pascal];
}

export default function ModulePage({ i }: { i: ModuleItem }) {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 400);
  
  const apiClient = getApiClient(i.key);

  const { data, isLoading, error } = useQuery({
    queryKey: [i.key, debouncedSearch],
    queryFn: async () => {
      if (!apiClient) return [];
      const res = await apiClient.search({ search: debouncedSearch, limit: 50 });
      // Depending on API, res might be { data, total } or an array
      return Array.isArray(res) ? res : (res.data || []);
    },
    staleTime: 5 * 60 * 1000,
  });

  const filteredData = data || [];
  const columns = filteredData.length > 0 ? Object.keys(filteredData[0]) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">{i.title}</h2>
        <Button>Add New</Button>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm">
        <div className="p-4 border-b border-border flex items-center gap-4">
          <Input 
            placeholder="Search..." 
            className="max-w-sm" 
            value={searchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
          />
        </div>
        
        {error && (
          <div className="p-4 text-red-500 text-center">
            Failed to load data: {String(error)}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
              <tr>
                {columns.map((key) => (
                  <th key={key} className="px-6 py-3 font-semibold">{key}</th>
                ))}
                <th className="px-6 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={100} className="px-6 py-8 text-center text-muted-foreground">
                    Loading {i.title}...
                  </td>
                </tr>
              ) : filteredData.length > 0 ? (
                filteredData.map((item: any, index: number) => (
                  <tr key={item.id || index} className="border-b border-border hover:bg-muted/50 transition-colors">
                    {columns.map((key: string, idx: number) => (
                      <td key={idx} className="px-6 py-4">
                        {typeof item[key] === 'object' ? JSON.stringify(item[key]) : String(item[key] ?? '—')}
                      </td>
                    ))}
                    <td className="px-6 py-4 text-right">
                      <Button variant="ghost" size="sm">Edit</Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={100} className="px-6 py-8 text-center text-muted-foreground">
                    No data available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
