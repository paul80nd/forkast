Feature: Shopping list
  As someone who has planned a week
  I want the planned recipes merged into one shopping list I can tick off
  So that I buy the right amounts in one pass

  Background:
    Given a clean collection

  Scenario: Ingredients merge across the planned recipes
    Given a recipe "r1" with "1 lime" bound to "lime"
    And a recipe "r2" with "1 lime" bound to "lime"
    And recipes "r1, r2" are on the plan for 2
    When I build the shopping list
    Then the list contains "limes · × 2"

  Scenario: Quantities scale to the plan's portions
    Given a recipe "r1" with "2 garlic" bound to "garlic"
    And recipes "r1" are on the plan for 4
    When I build the shopping list
    Then the list contains "garlic cloves · × 4"

  Scenario: An unbound ingredient is listed verbatim, not dropped
    Given a recipe "r1" with unbound "mystery herb"
    And recipes "r1" are on the plan for 2
    When I build the shopping list
    Then the unmatched items contain "mystery herb · × 1"

  Scenario: Binding an unbound ingredient makes it merge
    Given a recipe "r1" with unbound "lime"
    And a recipe "r2" with unbound "lime"
    And recipes "r1, r2" are on the plan for 2
    And I bind "lime" to "lime"
    When I build the shopping list
    Then the list contains "limes · × 2"
    And the unmatched items do not contain "lime"

  Scenario: Creating a new ingredient and binding to it merges the lines
    Given a recipe "r1" with unbound "gochujang"
    And recipes "r1" are on the plan for 2
    And I create an ingredient "gochujang" in aisle "Pantry" bought in "g"
    And I bind "gochujang" to that new ingredient
    When I build the shopping list
    Then the list has an aisle "Pantry"

  Scenario: A density lets a spoon-measured spice convert to grams
    Given a recipe "r1" using "2 tbsp garam masala"
    And recipes "r1" are on the plan for 2
    And I create an ingredient "garam masala" in aisle "Pantry" bought in "g"
    And I bind "garam masala" to that new ingredient
    And I set the density of that ingredient to "0.5"
    When I build the shopping list
    Then the list contains "garam masala · 15 g"

  Scenario: Editing a bound ingredient changes its aisle and buy unit
    Given a recipe "r1" with unbound "gochujang"
    And recipes "r1" are on the plan for 2
    And I create an ingredient "gochujang" in aisle "Pantry" bought in "g"
    And I bind "gochujang" to that new ingredient
    And I move that ingredient to aisle "Other" bought in "each"
    When I build the shopping list
    Then the list has an aisle "Other"

  Scenario: Renaming an ingredient changes how it reads on the list
    Given a recipe "r1" using "200 g gochujang"
    And recipes "r1" are on the plan for 2
    And I create an ingredient "gochujang" in aisle "Pantry" bought in "g"
    And I bind "gochujang" to that new ingredient
    And I rename that ingredient to "korean chilli paste" with plural "korean chilli paste"
    When I build the shopping list
    Then the list contains "korean chilli paste · 200 g"

  Scenario: An unbound line offers its own unit as the create-ingredient default
    Given a recipe "r1" using "150 ml soy sauce"
    And recipes "r1" are on the plan for 2
    When I build the shopping list
    Then the unbound line "soy sauce" defaults its buy unit to "ml"

  Scenario: An unused ingredient can be deleted from the dictionary
    Given I create an ingredient "sumac" in aisle "Pantry" bought in "g"
    When I delete that ingredient
    Then the dictionary has no ingredient named "sumac"

  Scenario: A bound ingredient is protected from deletion
    Given a recipe "r1" with unbound "gochujang"
    And I create an ingredient "gochujang" in aisle "Pantry" bought in "g"
    And I bind "gochujang" to that new ingredient
    When I try to delete that ingredient
    Then the dictionary still has an ingredient named "gochujang"

  Scenario: A merged line records how many recipes it combines
    Given a recipe "r1" using "2 tbsp soy sauce"
    And a recipe "r2" using "1 tbsp soy sauce"
    And recipes "r1, r2" are on the plan for 2
    And I bind "soy sauce" to "soy-sauce"
    When I build the shopping list
    Then the line "soy sauce · 45 ml" combines 2 recipes

  Scenario: With nothing planned the list is empty, not stuck
    When I build the shopping list
    Then the list has 0 meals

  Scenario: A stale plan id doesn't count as a meal
    Given a recipe "r1" with "1 lime" bound to "lime"
    And recipes "r1, ghost" are on the plan for 2
    When I build the shopping list
    Then the list has 1 meals
    And the list contains "lime · × 1"

  Scenario: Ticking an item off persists
    Given a recipe "r1" with "1 lime" bound to "lime"
    And recipes "r1" are on the plan for 2
    When I tick off "lime|each"
    Then "lime|each" is ticked

  Scenario: Undoing a Clear ticks restores the ticked items
    Given a recipe "r1" with "1 lime" bound to "lime"
    And recipes "r1" are on the plan for 2
    And I tick off "lime|each"
    When I clear all ticks
    And I restore ticks "lime|each"
    Then "lime|each" is ticked

  Scenario: Exporting the shopping list as text keeps ticks and conversions
    Given a recipe "r1" with "1 lime" bound to "lime"
    And recipes "r1" are on the plan for 2
    And I tick off "lime|each"
    When I export the shopping list as text
    Then the export contains "Lime x1 ✓"

  Scenario: A manual extra can be added and removed
    When I add the extra "birthday candles"
    Then the extras contain "birthday candles"
    When I remove extra 0
    Then there are no extras
