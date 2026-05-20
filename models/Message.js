import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  chatId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text:   { type: String, required: true },
  status: { type: String, enum: ['sent', 'delivered', 'read'], default: 'sent' }
}, { timestamps: true });

export default mongoose.model('Message', messageSchema);
