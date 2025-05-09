import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { trace, context } from '@opentelemetry/api';

const TodoList = () => {
  const [todos, setTodos] = useState([]);
  const [task, setTask] = useState('');
  const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
  const tracer = trace.getTracer('todo-frontend');

  // Fetch all todos on component mount
  useEffect(() => {
    const fetchTodos = async () => {
      // Create a span for fetching todos
      const span = tracer.startSpan('fetchTodos');
      
      try {
        const response = await axios.get(`${backendUrl}/todos`);
        setTodos(response.data);
        span.setStatus({ code: 0 }); // Success
      } catch (error) {
        console.error('There was an error fetching the todos!', error);
        span.setStatus({ 
          code: 1, // Error
          message: error.message 
        });
      } finally {
        span.end();
      }
    };

    fetchTodos();
  }, [backendUrl, tracer]);

  // Create a new todo
  const addTodo = async () => {
    if (task) {
      // Create a span for adding a todo
      const span = tracer.startSpan('addTodo');
      span.setAttribute('todo.task', task);
      
      try {
        const response = await axios.post(`${backendUrl}/todos`, { task });
        setTodos([...todos, response.data]);
        setTask('');
        span.setStatus({ code: 0 }); // Success
      } catch (error) {
        console.error('There was an error adding the todo!', error);
        span.setStatus({
          code: 1, // Error
          message: error.message
        });
      } finally {
        span.end();
      }
    }
  };

  // Toggle completion status of todo
  const toggleComplete = async (id, completed) => {
    // Create a span for toggling a todo's completion status
    const span = tracer.startSpan('toggleTodo');
    span.setAttribute('todo.id', id);
    span.setAttribute('todo.completed', !completed);
    
    try {
      const response = await axios.put(`${backendUrl}/todos/${id}`, { completed: !completed });
      setTodos(todos.map(todo => todo._id === id ? response.data : todo));
      span.setStatus({ code: 0 }); // Success
    } catch (error) {
      console.error('There was an error updating the todo!', error);
      span.setStatus({
        code: 1, // Error
        message: error.message
      });
    } finally {
      span.end();
    }
  };

  // Delete a todo
  const deleteTodo = async (id) => {
    // Create a span for deleting a todo
    const span = tracer.startSpan('deleteTodo');
    span.setAttribute('todo.id', id);
    
    try {
      await axios.delete(`${backendUrl}/todos/${id}`);
      setTodos(todos.filter(todo => todo._id !== id));
      span.setStatus({ code: 0 }); // Success
    } catch (error) {
      console.error('There was an error deleting the todo!', error);
      span.setStatus({
        code: 1, // Error
        message: error.message
      });
    } finally {
      span.end();
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