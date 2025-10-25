# TypeScript/React Design Principles for Declare Card Game

## Adapted from Java Design Principles for Modern Frontend Development

### 1. Documentation & Comments

- **Write comprehensive JSDoc comments for all public functions, components, and interfaces**
- Component comments should explain purpose, props, and behavior
- Interface documentation should describe the contract and usage examples
- Complex business logic should include inline comments explaining the reasoning

### 2. Type Safety & Interface Design

- **Use TypeScript interfaces over concrete types wherever possible**
- Prefer `interface` over `type` for object shapes that might be extended
- Use union types for controlled sets of values (e.g., `"hearts" | "diamonds"`)
- Avoid `any` type - use `unknown` or proper typing instead

### 3. Access Control & Encapsulation

- **Use private/protected class members and functions where appropriate**
- Keep component state and props as minimal as possible
- Use custom hooks to encapsulate complex logic
- Avoid exposing internal implementation details through props

### 4. Testing-First Development

- **Write tests before implementing features (TDD)**
- Test components in isolation with proper mocking
- Cover edge cases and error conditions
- Use React Testing Library for component testing

### 5. Error Handling & Validation

- **Catch and handle errors as early as possible**
- Use TypeScript's type system to prevent runtime errors
- Implement proper error boundaries for React components
- Validate props and external data at component boundaries

### 6. Composition over Inheritance

- **Prefer React composition patterns over class inheritance**
- Use Higher-Order Components (HOCs) or custom hooks for shared logic
- Compose components from smaller, focused components
- Use render props or children patterns for flexible component APIs

### 7. Type Safety over String Manipulation

- **Use enums, const assertions, and union types instead of string literals**
- Define card ranks, suits, and game states as typed constants
- Avoid magic strings - use typed constants instead

### 8. Exception Handling

- **Use proper error handling instead of exceptions for flow control**
- Implement graceful degradation for network failures
- Use error boundaries to catch and handle React errors
- Log errors appropriately for debugging

### 9. State Management & Consistency

- **Maintain consistent state throughout the application**
- Use React Context or state management libraries appropriately
- Avoid state mutations - use immutable updates
- Keep state as close to where it's used as possible

### 10. Reference Safety & Immutability

- **Avoid returning mutable references from functions**
- Use immutable data structures where possible
- Be careful with object/array references in React state
- Use proper dependency arrays in useEffect hooks

### 11. Single Responsibility Principle

- **Each component should have one clear responsibility**
- Separate UI components from business logic
- Use custom hooks for complex stateful logic
- Keep components focused and testable

### 12. Dynamic Dispatch & Polymorphism

- **Use TypeScript's discriminated unions for type-safe polymorphism**
- Implement proper type guards for runtime type checking
- Use function overloads for different parameter types
- Avoid explicit type checking - use proper abstractions

### 13. Code Reusability & DRY

- **Extract common logic into reusable functions and hooks**
- Create reusable UI components with proper prop interfaces
- Use composition to avoid code duplication
- Implement proper abstraction layers

### 14. Open/Closed Principle

- **Design components to be open for extension, closed for modification**
- Use composition and props to extend component behavior
- Implement proper plugin/extension patterns
- Design APIs that can grow without breaking changes

### 15. Extensibility & Future-Proofing

- **Design for likely future changes**
- Use flexible prop interfaces that can accommodate new features
- Implement proper versioning for APIs
- Design component hierarchies that can evolve

### 16. Testing Strategy

- **Write comprehensive tests covering all scenarios**
- Test components in isolation with proper mocking
- Cover edge cases and error conditions
- Use proper test organization and naming

### 17. Loose Coupling

- **Minimize dependencies between components**
- Use dependency injection patterns where appropriate
- Avoid hardcoded dependencies
- Design components to be independently testable

### 18. Interface Stability

- **Design stable component APIs that won't break consumers**
- Use proper versioning for breaking changes
- Implement backward compatibility where possible
- Document breaking changes clearly

### 19. Equality & Hashing

- **Implement proper equality checks for objects**
- Use proper comparison functions for React dependencies
- Implement proper memoization with useMemo/useCallback
- Be consistent with object equality across the application

### 20. Reuse Existing Solutions

- **Leverage existing React patterns and libraries**
- Use established UI component libraries where appropriate
- Implement proven design patterns
- Don't reinvent common functionality

## React-Specific Principles

### 21. Component Design

- **Keep components small and focused**
- Use proper prop drilling vs context appropriately
- Implement proper component composition
- Use React.memo for performance optimization where needed

### 22. State Management

- **Use appropriate state management patterns**
- Keep local state local, shared state shared
- Use proper state lifting patterns
- Implement proper state normalization for complex data

### 23. Performance Optimization

- **Implement proper React performance patterns**
- Use useMemo and useCallback appropriately
- Implement proper virtualization for large lists
- Use proper key props for list rendering

### 24. Accessibility

- **Implement proper accessibility patterns**
- Use semantic HTML elements
- Implement proper ARIA attributes
- Ensure keyboard navigation works properly

### 25. Error Boundaries

- **Implement proper error boundaries**
- Catch and handle React errors gracefully
- Provide meaningful error messages to users
- Log errors for debugging purposes
