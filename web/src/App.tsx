import { useState, useEffect } from 'react';
import { CustomerPicker } from './components/CustomerPicker';
import { OrdersApiResponse } from './types';

export function App() {
  const [customerId, setCustomerId] = useState<number>(1);
  const [page, setPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [response, setResponse] = useState<OrdersApiResponse | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`http://localhost:3000/orders?customerId=${customerId}&page=${page}&limit=20`)
      .then((res) => res.json())
      .then((data: OrdersApiResponse) => {
        setResponse(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch orders:', err);
        setLoading(false);
      });
  }, [customerId, page]);

  const handleCustomerChange = (newCustomerId: number) => {
    setCustomerId(newCustomerId);
    setPage(1);
  };

  return (
    <div className="container">
      <header>
        <h1>Customer Orders Dashboard</h1>
      </header>

      <CustomerPicker selectedCustomerId={customerId} onChange={handleCustomerChange} />

      {loading && <p>Loading orders...</p>}
    </div>
  );
}

export default App;
