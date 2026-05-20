import Chat from '../models/Chat.js';
import Message from '../models/Message.js';

export function initializeChatSocket(io) {
  io.on('connection', (socket) => {
    console.log(`User connected to socket: ${socket.id}`);

    // Join a specific chat room
    socket.on('join chat', (chatId) => {
      socket.join(chatId);
      console.log(`Socket ${socket.id} joined chat ${chatId}`);
    });

    // Handle new message
    socket.on('chat message', async (data) => {
      try {
        const { chatId, senderId, text } = data;
        
        // Save to DB
        const newMessage = await Message.create({
          chatId,
          sender: senderId,
          text
        });

        await Chat.findByIdAndUpdate(chatId, {
          lastMessage: newMessage._id,
          updatedAt: Date.now()
        });

        // Broadcast to everyone in the room
        io.to(chatId).emit('chat message', {
          ...newMessage.toObject(),
          sender: senderId 
        });
      } catch (err) {
        console.error('Error saving/sending message:', err);
      }
    });

    // Handle message status updates (delivered, read)
    socket.on('update message status', async (data) => {
      try {
        const { messageIds, status, chatId } = data; // status: 'delivered' or 'read'
        if (!messageIds || messageIds.length === 0) return;
        
        await Message.updateMany(
          { _id: { $in: messageIds } },
          { $set: { status } }
        );
        
        // Notify the room so the sender can update their UI
        io.to(chatId).emit('message status update', {
          messageIds,
          status,
          chatId
        });
      } catch (err) {
        console.error('Error updating message status:', err);
      }
    });

    // Handle typing events
    socket.on('typing', (data) => {
      socket.to(data.chatId).emit('user typing', { senderId: data.senderId, chatId: data.chatId });
    });

    socket.on('stop typing', (data) => {
      socket.to(data.chatId).emit('user stop typing', { senderId: data.senderId, chatId: data.chatId });
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected from socket: ${socket.id}`);
    });
  });
}
