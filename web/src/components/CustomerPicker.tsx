import React from 'react';

interface Props {
  selectedCustomerId: number;
  onChange: (id: number) => void;
}

export const CustomerPicker: React.FC<Props> = ({ selectedCustomerId, onChange }) => {
  const customers = Array.from({ length: 10 }, (_, i) => i + 1);

  return (
    <div className="picker-container">
      <label htmlFor="customer-select">Select Customer:</label>
      <select
        id="customer-select"
        value={selectedCustomerId}
        onChange={(e) => onChange(Number(e.target.value))}
      >
        {customers.map((id) => (
          <option key={id} value={id}>
            Customer #{id}
          </option>
        ))}
      </select>
    </div>
  );
};