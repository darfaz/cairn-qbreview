import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const CompanySelectionPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to dashboard - users should add clients through the Clients page
    navigate('/');
  }, [navigate]);

  return null; // This component just redirects
};

export default CompanySelectionPage;