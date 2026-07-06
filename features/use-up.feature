Feature: Use up ingredients
  As someone with ingredients to cook down
  I want the app to show which of them my plan doesn't use and suggest recipes that do
  So that I can turn leftovers into planned meals

  Background:
    Given a clean collection

  Scenario: An ingredient the plan uses reads "on plan"; the rest are unused
    Given a recipe "greek" with ingredients "feta cheese, olive oil"
    And a recipe "curry" with ingredients "baby spinach, lentils"
    And "greek" is on the plan
    And my use-up list has "feta, spinach"
    Then "feta" is on the plan
    And "spinach" is unused

  Scenario: Suggestions rank recipes by how many use-up ingredients they use
    Given a recipe "stew" with ingredients "spinach, harissa paste"
    And a recipe "dal" with ingredients "spinach, lentils"
    And my use-up list has "spinach, harissa"
    When I suggest recipes to use up
    Then the use-up suggestions in order are "stew, dal"

  Scenario: Only unused ingredients drive suggestions
    Given a recipe "planned" with ingredients "spinach"
    And a recipe "harissaBake" with ingredients "harissa paste, chickpeas"
    And another recipe "spinachPie" with ingredients "spinach, pastry"
    And "planned" is on the plan
    And my use-up list has "spinach, harissa"
    When I suggest recipes to use up
    Then the use-up suggestions in order are "harissaBake"

  Scenario: A no-go recipe is never suggested
    Given a recipe "ok" with ingredients "spinach"
    And a recipe "fishy" with ingredients "spinach" and allergen "fish"
    And my use-up list has "spinach"
    When I suggest recipes to use up
    Then the use-up suggestions in order are "ok"

  Scenario: Adding a suggested recipe puts it on the plan
    Given a recipe "stew" with ingredients "spinach, harissa paste"
    And my use-up list has "harissa"
    When I suggest recipes to use up
    And I add the first use-up suggestion to the plan
    Then the plan contains "stew"
