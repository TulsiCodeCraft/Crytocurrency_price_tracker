import  { useState, useEffect } from 'react';
import io from 'socket.io-client';
import { Bell, ArrowUp, ArrowDown, AlertTriangle, X, Search ,Clock} from 'lucide-react';

interface CryptoData {
  id: string;
  name: string;
  price: number;
  change24h: number;
}

interface Alert {
  cryptoId: string;
  targetPrice: number;
  condition: 'above' | 'below';
}

const socket = io('http://localhost:5000');

function App() {
  const [cryptoData, setCryptoData] = useState<CryptoData[]>([]);
  const [filteredCryptoData, setFilteredCryptoData] = useState<CryptoData[]>([]);
  const [alert, setAlert] = useState<Alert | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [isSettingAlert, setIsSettingAlert] = useState(false);
  const [selectedCrypto, setSelectedCrypto] = useState<string | null>(null);
  const [targetPrice, setTargetPrice] = useState('');
  const [condition, setCondition] = useState<'above' | 'below'>('above');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    socket.on('connect', () => console.log('Connected to server'));
    socket.on('connect_error', (error) => console.error('Connection error:', error));
    socket.on('priceUpdate', (data: CryptoData[]) => {
      setCryptoData(data);
      setFilteredCryptoData(data);
    });
    socket.on('alertTriggered', (data) => {
      setAlertMessage(`Alert: ${data.name} is now ${data.condition} $${data.targetPrice}`);
      setTimeout(() => setAlertMessage(null), 5000);
    });

    return () => {
      socket.off('connect');
      socket.off('connect_error');
      socket.off('priceUpdate');
      socket.off('alertTriggered');
    };
  }, []);

  useEffect(() => {
    const filtered = cryptoData.filter(crypto =>
      crypto.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredCryptoData(filtered);
  }, [searchTerm, cryptoData]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, []);

  const formatTimeIST = (date: Date) => {
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }).format(date);
  };

  const handleSetAlert = (cryptoId: string) => {
    setSelectedCrypto(cryptoId);
    setIsSettingAlert(true);
  };

  const submitAlert = () => {
    if (selectedCrypto && targetPrice && condition) {
      const newAlert: Alert = {
        cryptoId: selectedCrypto,
        targetPrice: parseFloat(targetPrice),
        condition
      };
      setAlert(newAlert);
      socket.emit('setAlert', newAlert);
      setIsSettingAlert(false);
      setTargetPrice('');
      setSelectedCrypto(null);
    }
  };

  const removeAlert = () => {
    setAlert(null);
    socket.emit('removeAlert');
  };

  return (
    <div className="min-h-screen bg-black text-orange-100 flex flex-col">
      {/* Header */}
      <header className="bg-orange-900 bg-opacity-20 p-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <img
              src="https://cdn-icons-png.flaticon.com/128/7280/7280222.png"
              alt="CryptoTracker Logo"
              className="w-10 h-10 rounded-full"
            />
            <h1 className="text-2xl font-bold text-orange-400">CryptoTracker</h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-orange-900 bg-opacity-30 text-orange-100 rounded-full py-2 px-4 pl-10 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <Search className="absolute left-3 top-2.5 text-orange-400" size={18} />
            </div>
            <div className="bg-orange-900 bg-opacity-30 px-3 py-1 rounded-full text-sm flex items-center">
              <Clock className="mr-2 text-orange-400" size={16} />
              <span className="text-orange-300">{formatTimeIST(currentTime)}</span>
            </div>
            <div className="bg-orange-900 bg-opacity-30 px-3 py-1 rounded-full text-sm">
              <span className="text-green-400 mr-2">●</span>
              <span className="text-orange-300">Live</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow p-6">
        <div className="max-w-7xl mx-auto">
          {/* Alerts Section */}
          <div className="mb-8">
            {(alertMessage || alert) && (
              <div className="bg-gradient-to-r from-orange-900 to-orange-800 rounded-xl p-6 border border-orange-700 shadow-lg">
                <h2 className="text-xl font-semibold text-orange-300 mb-4 flex items-center">
                  <AlertTriangle className="mr-2" />
                  Active Alerts
                </h2>
                <div className="space-y-4">
                  {alertMessage && (
                    <div className="p-4 bg-yellow-900 bg-opacity-40 backdrop-blur-sm border border-yellow-600 rounded-lg flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <AlertTriangle className="text-yellow-400" />
                        <span className="text-yellow-100">{alertMessage}</span>
                      </div>
                      <button
                        onClick={() => setAlertMessage(null)}
                        className="text-orange-300 hover:text-orange-200 transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}
                  {alert && (
                    <div className="p-4 bg-orange-900 bg-opacity-40 backdrop-blur-sm border border-orange-600 rounded-lg flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Bell className="text-orange-300" />
                        <span className="text-orange-100">
                          Watching {cryptoData.find(c => c.id === alert.cryptoId)?.name} for price {alert.condition} ${alert.targetPrice}
                        </span>
                      </div>
                      <button
                        onClick={removeAlert}
                        className="text-orange-300 hover:text-orange-200 transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Crypto Cards Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredCryptoData.map((crypto) => (
              <div
                key={crypto.id}
                className="bg-gradient-to-br from-orange-900 to-orange-800 bg-opacity-10 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-orange-700 relative overflow-hidden"
              >
                {alert?.cryptoId === crypto.id && (
                  <div className="absolute top-0 left-0 right-0 bg-yellow-500 text-gray-900 text-xs font-semibold py-1 px-2 text-center">
                    Alert Active
                  </div>
                )}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-xl font-semibold text-orange-300 mb-1">{crypto.name}</h2>
                    <p className="text-3xl font-bold text-orange-100">
                      ${crypto.price.toFixed(2)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleSetAlert(crypto.id)}
                    className="p-2 rounded-full bg-orange-700 hover:bg-orange-600 transition-colors text-orange-200 hover:text-orange-100"
                  >
                    <Bell size={18} />
                  </button>
                </div>
                <div className="flex items-center space-x-2">
                  <div
                    className={`flex items-center space-x-1 px-3 py-1 rounded-full ${
                      crypto.change24h >= 0
                        ? 'text-green-300 bg-green-900 bg-opacity-30'
                        : 'text-red-300 bg-red-900 bg-opacity-30'
                    }`}
                  >
                    {crypto.change24h >= 0 ? (
                      <ArrowUp size={16} />
                    ) : (
                      <ArrowDown size={16} />
                    )}
                    <span>{Math.abs(crypto.change24h).toFixed(2)}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-orange-900 bg-opacity-20 p-4 mt-8">
        <div className="max-w-7xl mx-auto text-center text-orange-300 text-sm">
          © 2023 CryptoTracker. All rights reserved.
        </div>
      </footer>

      {/* Alert Modal */}
      {isSettingAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-orange-900 to-orange-800 rounded-xl p-6 w-full max-w-md border border-orange-600 shadow-2xl">
            <h3 className="text-xl font-semibold text-orange-200 mb-4 flex items-center">
              <Bell className="mr-2 text-orange-400" />
              Set Price Alert
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-orange-200 mb-2">Target Price</label>
                <input
                  type="number"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                  className="w-full bg-orange-700 border border-orange-500 rounded-lg px-4 py-2 text-orange-100 focus:outline-none focus:border-orange-400"
                  placeholder="Enter price..."
                />
              </div>
              <div>
                <label className="block text-orange-200 mb-2">Condition</label>
                <div className="flex space-x-4">
                  <button
                    onClick={() => setCondition('above')}
                    className={`flex-1 py-2 rounded-lg transition-colors ${
                      condition === 'above'
                        ? 'bg-orange-500 text-black'
                        : 'bg-orange-700 text-orange-200 hover:bg-orange-600'
                    }`}
                  >
                    Above
                  </button>
                  <button
                    onClick={() => setCondition('below')}
                    className={`flex-1 py-2 rounded-lg transition-colors ${
                      condition === 'below'
                        ? 'bg-orange-500 text-black'
                        : 'bg-orange-700 text-orange-200 hover:bg-orange-600'
                    }`}
                  >
                    Below
                  </button>
                </div>
              </div>
              <div className="flex space-x-4 mt-6">
                <button
                  onClick={() => setIsSettingAlert(false)}
                  className="flex-1 py-2 rounded-lg bg-orange-700 text-orange-200 hover:bg-orange-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={submitAlert}
                  className="flex-1 py-2 rounded-lg bg-orange-500 text-black hover:bg-orange-400 transition-colors"
                >
                  Set Alert
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

