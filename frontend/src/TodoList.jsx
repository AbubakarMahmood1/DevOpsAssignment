import React, { useState, useEffect } from 'react';
import axios from 'axios';

const TodoList = () => {
  const [todos, setTodos] = useState([]);
  const [task, setTask] = useState('');
  const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'; // Use env var

  // Fetch all todos on component mount
  useEffect(() => {
    axios.get(`${backendUrl}/todos`)
      .then(response => {
        setTodos(response.data);
      })
      .catch(error => {
        console.error('There was an error fetching the todos!', error);
      });
  }, [backendUrl]);

  // Create a new todo
  const addTodo = async () => {
    if (task) {
      try {
        const response = await axios.post(`${backendUrl}/todos`, { task });
        setTodos([...todos, response.data]);
        setTask('');
      } catch (error) {
        console.error('There was an error adding the todo!', error);
      }
    }
  };

  // Toggle completion status of todo
  const toggleComplete = async (id, completed) => {
    try {
      const response = await axios.put(`${backendUrl}/todos/${id}`, { completed: !completed });
      setTodos(todos.map(todo => todo._id === id ? response.data : todo));
    } catch (error) {
      console.error('There was an error updating the todo!', error);
    }
  };

  // Delete a todo
  const deleteTodo = async (id) => {
    try {
      await axios.delete(`${backendUrl}/todos/${id}`);
      setTodos(todos.filter(todo => todo._id !== id));
    } catch (error) {
      console.error('There was an error deleting the todo!', error);
    }
  };

  return (
    <div>
      <h1>To-Do List</h1>
      <input 
        type="text" 
        value={task} 
        onChange={(e) => setTask(e.target.value)} 
        placeholder="Enter a new task" 
      />
      <button onClick={addTodo}>Add Todo</button>

      <ul>
        {todos.map(todo => (
          <li key={todo._id}>
            <span 
              style={{ textDecoration: todo.completed ? 'line-through' : 'none' }}
              onClick={() => toggleComplete(todo._id, todo.completed)}
            >
              {todo.task}
            </span>
            <button onClick={() => deleteTodo(todo._id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TodoList;