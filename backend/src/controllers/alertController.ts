import Alert, { IAlert } from '../models/Alert';

interface AlertData {
  cryptoId: string;
  targetPrice: number;
  condition: 'above' | 'below';
}

export const createAlert = async (userId: string, alertData: AlertData): Promise<IAlert> => {
  try {
    const alert = new Alert({
      userId,
      ...alertData
    });
    return await alert.save();
  } catch (error) {
    throw new Error(`Error creating alert: ${error instanceof Error ? error.message : String(error)}`);
  }
};

export const getActiveAlerts = async (): Promise<IAlert[]> => {
  try {
    return await Alert.find({ isActive: true });
  } catch (error) {
    throw new Error(`Error fetching alerts: ${error instanceof Error ? error.message : String(error)}`);
  }
};

export const deactivateAlert = async (alertId: string): Promise<IAlert | null> => {
  try {
    const updatedAlert = await Alert.findByIdAndUpdate(
      alertId,
      { isActive: false },
      { new: true }
    );
    
    if (!updatedAlert) {
      throw new Error('Alert not found');
    }
    
    return updatedAlert;
  } catch (error) {
    throw new Error(`Error deactivating alert: ${error instanceof Error ? error.message : String(error)}`);
  }
};

