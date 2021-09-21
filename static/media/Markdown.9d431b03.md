# **JAVA Review**


## **Basics**

#### _**AccessModifiers**_
![Access modifiers and control](/src/Components/Images/JavaImages/AccessModifiers.png)

#### _**Casting**_
Casting is used to convert data from one data tye to another. [Basic data types](http://tutorials.jenkov.com/java/data-types.html) There are two types : 
- _**Primite casting :**_ Considering primitive data types in java which represents numbers. The data types in order are 
> byte < short < int < long < float < double 

The two types of conversion are **Auto widening** and **Explicit Narrowing**

1. **Auto widening :** When converting data from left to right in the above mentioned order.
```java
    byte b = 10;
    short s = b;      //byte is auto widened to short
    long j = s;     //int is auto widened to long
    double d = j;    //float is auto widened double
```
2. **Explicit Narrowing :** When converting from right to left in the above order. Percision is usually lost in narrowing. 
```java
    double d = 10.25;
    float f = (float) d;      //double is explicitly narrowed to float
    long l = (long) f
    int i = (int) l;     //long is explicitly narrowed to int
    short s = (short) i;
    byte b = (byte) s;    //float is explicitly narrowed to long and short to byte
```
- _**Derived casting :**_ Similar to primitive, the other objects are also **Auto-up casted** and **Explicit down casted**.
1. **Auto-up casting :** Auto-Up Casting is used to change the type of object from sub class type to super class type. i.e an object of sub class type is automatically converted to an object of super class type.
```java
class A {
    int i = 10;
}
 
class B extends A {
    int j = 20;
}
 
class C extends B {
    int k = 30;
}
 
class D extends C {
    int m = 40;
}
 
public class AutoUpCasting {
    public static void main(String[] args) {
        D d = new D();
        C c = d;       // D type object is Auto-Up Casted to C type
        B b = d;      // D type object is Auto-Up Casted to B type
        C c1 = new C();
        A a = c1;    // C type object is Auto-Up Casted to A type
        A a1 = new B(); // B type object is Auto-Up Casted to A type
    }
}
```
2. **Explicit Down Casting :** Explicit down Casting is used to change the type of object from super class type to sub class type. i.e you have to explicitly convert an object of super class type to an object of sub class type.
```java
class A {
    int i = 10;
}
 
class B extends A {
    int j = 20;
}
 
class C extends B {
    int k = 30;
}
 
class D extends C {
    int m = 40;
}
 
public class ExplicitDownCasting {
    public static void main(String[] args) {
        A a = new A();
        B b = (B) a;   //A type is explicitly downcasted to B type
        C c = (C) a;   //A type is explicitly downcasted to C type
        D d = (D) a;   //A type is explicitly downcasted to D type
        B b1 = new B();
        D d1 = (D) b1;  //B type is explicitly downcasted to D type
        d1 = (D) new C();  //C type is explicitly downcasted to D type
    }
}
```
_**ClassCastException**_ This is a run time exception that occurs when an object cannot be casted to another type. 
```java
class A {
    int i = 10;
}
 
class B extends A {
    int j = 20;
}
 
class C extends B {
    int k = 30;
}
 
public class ClassCastExceptionDemo {
    public static void main(String[] args) {
        A a = new B();   //B type is auto up casted to A type
        B b = (B) a;     //A type is explicitly down casted to B type.
        C c = (C) b;    //Here, you will get class cast exception
        System.out.println(c.k);
    }
}
```
This occurs because every subclass will have properties of parent class and additional own properties. So when we created a object of B and casting it to C, the compiler expects the property k to be present in the object which is absent. So the exception is thrown. Another reason is B object is also A type by definition by no related to C. So the exception occurs.


#### _**Nested Classes(Inner classes)**_
There can 4 types of inner classes
* _**Static nested class:**_
    ```java
    public class Outer {
        public static class Inner {

        }
    }

    Outer.Inner instance = new Outer.Inner();
    ```
    In Java a static nested class is essentially a normal class that has just been nested inside another class. Being static, a static nested class can only access instance variables of the enclosing class via a reference to an instance of the enclosing class.

* _**Non-Static nested classes:**_
    ```java
    public class Outer {
        public class Inner {

        }
    }

    Outer outer = new Outer();
    Outer.Inner inner = outer.new Inner();
    ```
    Inner class will have access to the private variables and mehtods of the outer class.
    * Variable shadowing
    ```java
    public class Outer {
        private String text = "I am Outer private!";
        public class Inner {
            private String text = "I am Inner private";
            public void printText() {
                System.out.println(text);
                System.out.println(Outer.this.text);
            }
        }
    }
    ```
    Inner class will have access to inner as well as outer variables.

* _**Local classes:**_
    Local classes are similar to inner class except they are created inside a method and cannot be accessed outside the method directly. They can be accessed from inside a method or block scope. 
    - From Java 8 local classes can also access local variables and parameters of the method the local class is declared in. The parameter will have to be declared final or be effectually final. Effectually final means that the variable is never changed after it is initialized. Method parameters are often effectually final.

    - [Jenkov](http://tutorials.jenkov.com/java/nested-classes.html#inner-class-shadowing)

* _**Anonymous classes:**_
    These are nested classes that are created in place.
    ```java
    public class SuperClass {
        public void doIt() {
            //Statements
        }
    }
    SuperClass instance = new SuperClass() {
        public void doIt() {
            //statements
        }
    };
    instance.doIt();
    ```
    Anonymous inner class can also implement Interfaces

## **Class & Object**
Java execution divides the memory into two parts - Stack and heap. In order
1. Checks if MainClass is present and loads it if not present. Randomly allocates places to main class(Class memory). Main method is added to stack for execution.
2. Static members are loaded in class memory.
    1. Static variable first
    2. SIB to initialize the variables.

![Execution in memory](/src/Components/Images/JavaImages/StaticMemoryExecution.png)

#### _**Static members**_
When compiling, static members are the first once to load in the memory. Static Initialization Block (SIB) is used to initialize only static variables

```java
static int variable;
static {
    //initialize static variables
}
```
#### _**Non-Static members**_
```java
int variable;
void methodName() {
    //statements
}
```
#### _**Instance Initialization Block**_
These are used to initialize the state of the objects (instace variables or non-static variables). Blocks with no name. In class object after static variables, instance variable are initialized.

```java
{
    //initialization
}
```

### **Class concepts**
##### _Constructor_
* Constructor is same name as class with no return type.
* Compiler will provide a constructor if not provided.
* Can be private but the cannot be used outside of the class.
* Can be overloaded but cannot be static, final or abstract.
* If extended class then super() or this() is the first statement. (compiler class super() by default)
* recursive constructor gives compile time error.

Initialization: ![Compiler](/src/Components/Images/JavaImages/SuperAndThis.png)

##### **Inheritance**
Used to add functionalities to existing class. 'extends' keyword.
1. Constructors, SIB and IIB are not inherited but are executed when creating an object.
2. Multiple inheritance is not supported by Java

```java
class A {
	static {
		System.out.println("Class A SIB");
	}
	{
		System.out.println("Class A IIB");
	}
	A() {
		System.out.println("Class A constructor");
	}
}
class B extends A {
	static {
		System.out.println("Class B SIB");
	}
	{
		System.out.println("Class B IIB");
	}
	B() {
		System.out.println("Class B constructor");
	}
}
```
output: ![new B()](/JavaImages/Initialization.png)

Usage of keywords in inheritance:
- private - Cannot be inherited by subclass
- default - Can be inherited by subclass in same package
- protected - Similar to default
- public - Can be inherited by all subclasses

## **ENUMS**
An _**enum**_ is a special kind of class which can be used in place of class or interface. Enums are effectively static final variable and can have [methods](http://tutorials.jenkov.com/java/enums.html) and constructors as well.
```java
public enum Level {
    HIGH  (3),  //calls constructor with value 3
    MEDIUM(2),  //calls constructor with value 2
    LOW   (1)   //calls constructor with value 1
    ; // semicolon needed when fields / methods follow


    private final int levelCode;

    Level(int levelCode) {
        this.levelCode = levelCode;
    }
    
    public int getLevelCode() {
        return this.levelCode;
    }
    
}
```
enums can have abstract methods as well but all the methods must implement the method. Java proovides [EnumSet](https://docs.oracle.com/javase/7/docs/api/java/util/EnumSet.html) and [EnumMap](https://docs.oracle.com/javase/7/docs/api/java/util/EnumMap.html) as special implementations to the enums. 


## _**Polymorphism**_
Two type polymorphism at compile time(static) and at run time(dynamic).

#### _Static polymorphism_
Object is determined during compile so this is called _**static binding or early binding**_.

* **Operator overloading** - '+' is the only operator overloading as it can add two numbers and concatinate two strings as well
* **Constructor Overloading** - If multiple constructor are present, they are binded to the class at the compile stage and object can be intialized by any constructor.
* **Method overloading** - Different form(different method signatures) of same method can also exist during compile time allowing for polymorphism.

#### _Dynamic polymorphism_
Entity showing dynamic polymorphism is decided during run time.
* **Method Overriding** - Method overriding is a good example of dynamic polymorphism. Which method to use is determined using the run time.

## _**Abstraction**_

### **Abstract classes**
Abstraction is the idea of having a blueprint. Since this is just a blueprint, we cannot instantiate the object. Will throw compile time error if tried.

 ```java
    public abstract class MyAbstractProcess {
        public void process() {
            stepBefore();
            action();
            stepAfter();
        }
        public void stepBefore() {
            //implementation directly in abstract superclass
        }
        public abstract void action(); // implemented by subclasses
        public void stepAfter() {
            //implementation directly in abstract superclass
        }
    }
```


### **Abstract methods**
An abstract class can have abstract methods. But to declare an abstract method, class has to be abstract. 
Abstract methods are implemented by the sub classes.


### **Interfaces**

Intefaces are similar to abstract but they contain only abstract methods. Concrete methods are not allowed. The implementing class can have will be instantiated to use the methods. Since a class can implement multiple interfaces, there could be a problem where the interfaces have same methods signatures(name + parameters). Java does not provide any solution for this. Its upto the programmer to decide what to do with the situation.
An interface can be implemented by :
- Java class
- Java abstract class
- Nested class
- Enum
- [Dynamic proxy](http://tutorials.jenkov.com/java-reflection/dynamic-proxies.html)

Since it does not make sence to place variables in the interface, all variable and constants in interface are public, static, final by default.
> Methods in interface must be static, final, native or strictfp.

_**Starting Java 8:**_

Starting Java 8, _**default**_ implementation of a method is added so that the API does not break if the client does not implement the methods. 

Interface can have static methods but they must have implementation. These methods can be directly accessed by _**MyInterface.methods()**_.

Java 8 has added some complexity to this because a class can implement multiple interfaces and the interfaces can have a method with same methods signature and being implemented as default. _**So the Java compiler explicitly needs the method to be implemented to avoid the problem.**_ This eliminated the problem of what method to use in the implementing class during runtime. 


### _**Abstract and Interface difference**_
Since a class in java can have only one super class, interfaces can be used as a mechanism to decouple the common mechanisms or properties in to one interface that can implemented. Therefore interfaces are more flexible mechanisms for exposing common interface And abstract class typycally becomes a base class for extention by the subclass. Using both interface and abstract in code makes it more flexible. 
- Fields : Interface varables are public, static and final by default. Abstract can have both static and non-static, final and non-final variables.
- Methods: Interface methods can only be absract or default and not final. Abstract can have abstract and concrete methods, final and non-final methods.
- Constructors : Interfaces cannot have constructors. 
- Scope: Interface is all public by default. Abstract can have private, protected, default and public.
- Inheritance : A class can extend only one abstract class but implement multiple interfaces. 

Differences: ![Pic](/JavaImages/InterfaceVsAbstractClassJava8.png)

## **Generics**

Generics were added in Java 5 as way to ensure compile-safetey and enable developers to write one sort method for all elements in array or collections. Basing on the _**generic**_ argument, the compiler handles the method calls efficiently. Generics are declared in the _**< E >**_paranthesis. 

```java 
public class GenericMethodTest {
   // generic method printArray
   public static < E > void printArray( E[] inputArray ) {
      // Display array elements
      for(E element : inputArray) {
         System.out.printf("%s ", element);
      }
   }

   public static void main(String args[]) {
      // Create arrays of Integer, Double and Character
      Integer[] intArray = { 1, 2, 3, 4, 5 };
      Double[] doubleArray = { 1.1, 2.2, 3.3, 4.4 };
      Character[] charArray = { 'H', 'E', 'L', 'L', 'O' };

      System.out.println("Array integerArray contains:");
      printArray(intArray);   // pass an Integer array

      System.out.println("\nArray doubleArray contains:");
      printArray(doubleArray);   // pass a Double array

      System.out.println("\nArray characterArray contains:");
      printArray(charArray);   // pass a Character array
   }
}
```
Starting Java 7, the compiler can infer the type of the generic based on the collection instantiated.
> List<String> strings = new ArrayList<>();

As seen the use of _**<>(Diamond operator)**_ will tell compiler to infer the type from the type of instantiating variable which in this case is 'String'.

Generics provides a mechanism called **WILDCARDS** making it possible to cast methods to subclass. More on that [here](http://tutorials.jenkov.com/java-generics/wildcards.html)



## **JAVA 8**
Java 8 is a step towards _functional programming_. And new features include _**Lambda expresion, Method reference, default methods, new tools, Steam API DateTime API, Optional**_

[CodeExamples](https://github.com/gauravrmazra/gauravbytes/tree/master/core-java-8/src/main/java/com/gauravbytes/java8)

### **Lambda expression**
Eg:
```java
public class Java8Tester {
   public static void main(String args[]) {
      List<String> names1 = new ArrayList<String>();
      names1.add("Mahesh ");
      names1.add("Suresh ");
      names1.add("Ramesh ");
      names1.add("Naresh ");
      names1.add("Kalpesh ");
		
      List<String> names2 = new ArrayList<String>();
      names2.add("Mahesh ");
      names2.add("Suresh ");
      names2.add("Ramesh ");
      names2.add("Naresh ");
      names2.add("Kalpesh ");
		
      Java8Tester tester = new Java8Tester();
		
      tester.sortUsingJava7(names1);
      System.out.println(names1);
		
      tester.sortUsingJava8(names2);
      System.out.println(names2);
   }
   private void sortUsingJava7(List<String> names) {  //sort using java 7
      Collections.sort(names, new Comparator<String>() {
         @Override
         public int compare(String s1, String s2) {
            return s1.compareTo(s2);
         }
      });
   }
   private void sortUsingJava8(List<String> names) {  //sort using java 8
      Collections.sort(names, (s1, s2) -> s1.compareTo(s2));
   }
}
```

Functional interface is an interface that has only 1 abstract method. This is a first step to functional programming. Where function can stored, used and passed as objects.
```java
public class Java8 {
	public static void main(String[] args) {
		MathOperation add = (a, b) -> a + b;
		MathOperation subtract = (a, b) -> {return (a - b);};
		MathOperation multiply = (a, b) -> (a * b);
		MathOperation divide = (int a, int b) -> a / b;
		System.out.println(check(8, 2, add));
		System.out.println(check(8, 2, subtract));
		System.out.println(check(8, 2, multiply));
		System.out.println(check(8, 2, divide));
	}
	interface MathOperation { //Functional interface
		int operate(int a, int b);
	}
	static int check(int a, int b, MathOperation mp) { //Interface being passed as parameter
		return mp.operate(a, b);
	}
}
```
The java compiler will match the input and output types of the lambda expression from the interfaces. Lambda in java is escentially and object and can be assigned to a variable or passed into method as a parameter.
Lambda features : 
- **Optional type declarations :** since the compiler already has the required information, the type declaration for the method becomes optional.
- **Optional paranthesis :** no paranthesis for lambda expression with _**single parameter.**_
- **Optional curly braces :** no curly braces are needed if the function is only single statement.
- **Optional return statement :** compiler automatically understands the return if the lamda expression is of _**single statement.**_

Lambda expression can access variables that are static or final or effectively final else compiler error is thrown. 

### **METHOD REFERENCE**
This Java 8 feature is used to call methods by their name. This can be used by using "::" symbol. This can be used to point following types of method :
* Static methods
* Instance methods
* Constructor using new operator

To access the methods, the following way are used.
Kind | Example
-- | --
Static method | ContainingClass::staticMethodName
Instance object | containingObject::instanceMethodName
Instance method of particular type | ContainingType::methodName
Constructor reference | ClassName::new

* [Reference1](https://www.baeldung.com/java-method-references)
* [Reference2](https://www.tutorialspoint.com/java8/java8_method_references.htm)
* [Reference3](https://javaconceptoftheday.com/java-8-method-references/)
* [CodeExample](https://github.com/gauravrmazra/gauravbytes/blob/master/core-java-8/src/main/java/com/gauravbytes/java8/methodref/MethodReferenceExample.java)

#### _**Static method**_
```java
public class Java8Tester {
   public static void main(String args[]) {
      List names = new ArrayList();	
      names.add("Mahesh");
      names.add("Suresh");
      names.add("Ramesh");
      names.add("Naresh");
      names.add("Kalpesh");
      names.forEach(System.out::println);
   }
}
```
## **STREAMS**
[IBMDeveloper stream index](https://developer.ibm.com/dwblog/2016/dive-into-java-streams-library/)
 - [IBMDeveloper doc 1](https://developer.ibm.com/articles/j-java-streams-1-brian-goetz/)
 - [IBMDeveloper doc 2](https://developer.ibm.com/articles/j-java-streams-2-brian-goetz/)
 - [IBMDeveloper doc 3](https://developer.ibm.com/articles/j-java-streams-3-brian-goetz/)




## **Exceptions**

![ExceptionHierarchy](/src/Components/Images/JavaImages/ExceptionHierarchy.jpg)

## _**Collection**_

![ExceptionHierarchy](/src/Components/Images/JavaImages/Collection-Framework-hierarchy.png)